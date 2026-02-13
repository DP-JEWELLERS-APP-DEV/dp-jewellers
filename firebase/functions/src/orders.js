const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { logActivity } = require("./activityLog");
const { _calculateVariantPriceInternal, _normalizeConfigurator } = require("./priceCalculation");

const db = admin.firestore();

// Verify admin with order permissions
async function verifyOrderAdmin(auth) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const adminDoc = await db.collection("admins").doc(auth.uid).get();
  if (!adminDoc.exists || !adminDoc.data().isActive) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  const data = adminDoc.data();
  if (data.role !== "super_admin" && !data.permissions?.manageOrders) {
    throw new HttpsError("permission-denied", "Order management permission required.");
  }
  return data;
}

/**
 * Generate a unique order ID: DP-ORD-YYYYMMDD-XXX
 */
async function generateOrderId() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `DP-ORD-${dateStr}`;

  // Count today's orders
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const todayOrders = await db.collection("orders")
    .where("orderedAt", ">=", startOfDay)
    .where("orderedAt", "<", endOfDay)
    .count()
    .get();

  const count = todayOrders.data().count + 1;
  return `${prefix}-${String(count).padStart(3, "0")}`;
}

/**
 * Create a new order
 */
exports.createOrder = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to place an order.");
  }

  const { items, deliveryType, shippingAddress, selectedStore, paymentMethod, couponCode, partialPayment } = request.data;

  if (!items || items.length === 0) {
    throw new HttpsError("invalid-argument", "Order must contain at least one item.");
  }

  if (!deliveryType || !["store_pickup", "home_delivery"].includes(deliveryType)) {
    throw new HttpsError("invalid-argument", "Invalid delivery type.");
  }

  if (deliveryType === "home_delivery" && !shippingAddress) {
    throw new HttpsError("invalid-argument", "Shipping address required for home delivery.");
  }

  if (deliveryType === "store_pickup" && !selectedStore) {
    throw new HttpsError("invalid-argument", "Store selection required for pickup.");
  }

  // Fetch metal rates, tax settings, and making charges EARLY for variant pricing
  let metalRatesSnapshot = null;
  let rates = {};
  let taxSettings = { gst: { jewelry: 3 } };
  let makingChargesConfig = {};

  try {
    const [ratesDoc, taxDoc, makingChargesDoc] = await Promise.all([
      db.collection("metalRates").doc("current").get(),
      db.collection("taxSettings").doc("current").get(),
      db.collection("makingCharges").doc("current").get(),
    ]);

    if (ratesDoc.exists) {
      metalRatesSnapshot = ratesDoc.data();
      rates = ratesDoc.data();
    }
    if (taxDoc.exists) {
      taxSettings = taxDoc.data();
    }
    if (makingChargesDoc.exists) {
      makingChargesConfig = makingChargesDoc.data();
    }
  } catch (err) {
    console.log("Warning: Could not fetch rates/config for pricing:", err.message);
  }

  // Validate and build order items with current variant prices
  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    const productDoc = await db.collection("products").doc(item.productId).get();
    if (!productDoc.exists || !productDoc.data().isActive) {
      throw new HttpsError("not-found", `Product ${item.productId} not found or unavailable.`);
    }

    const product = productDoc.data();

    // Check stock
    if (!product.inventory?.inStock || (product.inventory?.quantity || 0) < (item.quantity || 1)) {
      throw new HttpsError("failed-precondition", `${product.name} is out of stock.`);
    }

    // Recalculate price using variant pricing
    const purity = item.selectedPurity || product.configurator?.defaultPurity;
    const metalType = item.selectedMetalType || product.configurator?.defaultMetalType;
    const itemPricing = _calculateVariantPriceInternal(
      product, rates, taxSettings, makingChargesConfig,
      purity,
      item.selectedDiamondQuality || null,
      item.selectedSize || item.size || null,
      metalType
    );

    const itemTotal = itemPricing.finalPrice * (item.quantity || 1);
    subtotal += itemTotal;

    orderItems.push({
      productId: item.productId,
      productName: product.name,
      productCode: product.productCode,
      selectedSize: item.selectedSize || null,
      selectedMetalType: metalType,
      selectedPurity: purity,
      selectedColor: item.selectedColor || null,
      selectedDiamondQuality: item.selectedDiamondQuality || null,
      quantity: item.quantity || 1,
      priceSnapshot: {
        metalValue: itemPricing.metalValue,
        diamondValue: itemPricing.diamondValue,
        makingCharges: itemPricing.makingChargeAmount,
        wastageCharges: itemPricing.wastageChargeAmount,
        otherCharges: (itemPricing.stoneSettingCharges || 0) + (itemPricing.designCharges || 0),
        subtotal: itemPricing.subtotal,
        discount: itemPricing.discount,
        tax: itemPricing.taxAmount,
        itemTotal: itemPricing.finalPrice,
      },
      image: product.images?.[0]?.url || "",
    });
  }

  // Apply coupon if provided
  let couponDiscount = 0;
  if (couponCode) {
    const couponSnapshot = await db.collection("coupons")
      .where("code", "==", couponCode)
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (!couponSnapshot.empty) {
      const coupon = couponSnapshot.docs[0].data();
      const now = new Date();

      if (coupon.validFrom?.toDate() <= now && coupon.validTo?.toDate() >= now) {
        if (subtotal >= (coupon.minOrderValue || 0)) {
          if ((coupon.usageLimit?.currentUses || 0) < (coupon.usageLimit?.totalUses || Infinity)) {
            if (coupon.discountType === "percentage") {
              couponDiscount = Math.min(
                subtotal * (coupon.discountValue / 100),
                coupon.maxDiscountAmount || Infinity
              );
            } else {
              couponDiscount = coupon.discountValue;
            }

            // Increment coupon usage
            await couponSnapshot.docs[0].ref.update({
              "usageLimit.currentUses": admin.firestore.FieldValue.increment(1),
            });
          }
        }
      }
    }
  }

  const shippingCharges = 0; // Free shipping
  const totalAmount = Math.round(subtotal - couponDiscount + shippingCharges);

  // Validate partial payment if provided
  if (partialPayment && deliveryType === "store_pickup") {
    const minRequired = Math.ceil(totalAmount * 0.1);
    if (partialPayment.amountPaid < minRequired) {
      throw new HttpsError("invalid-argument", `Minimum payment is ₹${minRequired} (10% of order total).`);
    }
    if (partialPayment.amountPaid > totalAmount) {
      throw new HttpsError("invalid-argument", "Payment amount cannot exceed order total.");
    }
  }

  const orderId = await generateOrderId();

  const order = {
    orderId,
    userId: request.auth.uid,
    items: orderItems,
    orderSummary: {
      subtotal,
      couponCode: couponCode || "",
      couponDiscount: Math.round(couponDiscount),
      shippingCharges,
      tax: 0, // Tax already included in item prices
      totalAmount,
    },
    deliveryType,
    shippingAddress: deliveryType === "home_delivery" ? shippingAddress : null,
    selectedStore: deliveryType === "store_pickup" ? selectedStore : null,
    paymentMethod: paymentMethod || "online",
    paymentStatus: "pending",
    paymentId: "",
    paymentGateway: "",
    partialPayment: partialPayment && deliveryType === "store_pickup" ? {
      isPartialPayment: true,
      amountPaid: partialPayment.amountPaid,
      amountRemaining: totalAmount - partialPayment.amountPaid,
    } : null,
    metalRatesSnapshot: metalRatesSnapshot || null,
    priceLockDate: admin.firestore.FieldValue.serverTimestamp(),
    orderStatus: "pending",
    trackingUpdates: [
      {
        status: "pending",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        note: "Order placed successfully.",
      },
    ],
    orderedAt: admin.firestore.FieldValue.serverTimestamp(),
    confirmedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    cancellation: null,
  };

  const docRef = await db.collection("orders").add(order);

  // Update product inventory
  for (const item of items) {
    await db.collection("products").doc(item.productId).update({
      "inventory.quantity": admin.firestore.FieldValue.increment(-(item.quantity || 1)),
      purchaseCount: admin.firestore.FieldValue.increment(item.quantity || 1),
    });
  }

  // Clear user's cart
  await db.collection("users").doc(request.auth.uid).update({
    cart: [],
  });

  return {
    orderDocId: docRef.id,
    orderId,
    totalAmount,
    message: "Order placed successfully.",
  };
});

/**
 * Update order status (admin only)
 */
exports.updateOrderStatus = onCall({ region: "asia-south1" }, async (request) => {
  const adminData = await verifyOrderAdmin(request.auth);

  const { orderDocId, newStatus, note, estimatedDeliveryDate, delayReason } = request.data;

  if (!orderDocId || !newStatus) {
    throw new HttpsError("invalid-argument", "orderDocId and newStatus are required.");
  }

  const validStatuses = ["pending", "confirmed", "processing", "ready_for_pickup", "out_for_delivery", "delivered", "cancelled"];
  if (!validStatuses.includes(newStatus)) {
    throw new HttpsError("invalid-argument", `Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  const orderRef = db.collection("orders").doc(orderDocId);
  const orderDoc = await orderRef.get();

  if (!orderDoc.exists) {
    throw new HttpsError("not-found", "Order not found.");
  }

  const currentOrder = orderDoc.data();

  // Prevent updating cancelled/delivered orders
  if (currentOrder.orderStatus === "delivered" || currentOrder.orderStatus === "cancelled") {
    throw new HttpsError("failed-precondition", `Cannot update a ${currentOrder.orderStatus} order.`);
  }

  const trackingNote = note || `Order ${newStatus}.`;
  const updateData = {
    orderStatus: newStatus,
    trackingUpdates: admin.firestore.FieldValue.arrayUnion({
      status: newStatus,
      timestamp: new Date(),
      note: trackingNote,
      updatedBy: request.auth.uid,
    }),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Handle estimated delivery date
  if (estimatedDeliveryDate) {
    const newDeliveryDate = new Date(estimatedDeliveryDate);
    const currentDeliveryDate = currentOrder.estimatedDeliveryDate?.toDate
      ? currentOrder.estimatedDeliveryDate.toDate()
      : currentOrder.estimatedDeliveryDate
        ? new Date(currentOrder.estimatedDeliveryDate)
        : null;

    updateData.estimatedDeliveryDate = newDeliveryDate;

    // If delivery date changed and delay reason provided, store it
    if (delayReason && currentDeliveryDate && newDeliveryDate > currentDeliveryDate) {
      updateData.delayReason = delayReason;
      updateData.delayHistory = admin.firestore.FieldValue.arrayUnion({
        previousDate: currentDeliveryDate,
        newDate: newDeliveryDate,
        reason: delayReason,
        updatedBy: request.auth.uid,
        updatedAt: new Date(),
      });
    }
  }

  if (newStatus === "confirmed") {
    updateData.confirmedAt = admin.firestore.FieldValue.serverTimestamp();
  } else if (newStatus === "delivered") {
    updateData.deliveredAt = admin.firestore.FieldValue.serverTimestamp();
    updateData.paymentStatus = "paid";
  } else if (newStatus === "cancelled") {
    updateData.cancelledAt = admin.firestore.FieldValue.serverTimestamp();
    updateData.cancellation = {
      cancelledBy: "admin",
      reason: note || "Cancelled by admin.",
      refundStatus: currentOrder.paymentStatus === "paid" ? "pending" : "not_applicable",
      refundAmount: currentOrder.paymentStatus === "paid" ? currentOrder.orderSummary.totalAmount : 0,
    };

    // Restore inventory
    for (const item of currentOrder.items) {
      await db.collection("products").doc(item.productId).update({
        "inventory.quantity": admin.firestore.FieldValue.increment(item.quantity || 1),
        purchaseCount: admin.firestore.FieldValue.increment(-(item.quantity || 1)),
      });
    }
  }

  await orderRef.update(updateData);

  logActivity({ module: "orders", action: "updateStatus", entityId: orderDocId, entityName: currentOrder.orderId || orderDocId, performedBy: request.auth.uid, performedByEmail: adminData.email, performedByRole: adminData.role, details: { oldStatus: currentOrder.orderStatus, newStatus, note: note || "" } });

  return { orderDocId, newStatus, message: `Order status updated to ${newStatus}.` };
});

/**
 * List all orders (admin only) with optional status filter
 */
exports.listOrders = onCall({ region: "asia-south1" }, async (request) => {
  await verifyOrderAdmin(request.auth);

  const { limit: queryLimit = 50, startAfterDoc, status } = request.data || {};

  let ordersQuery = db.collection("orders")
    .orderBy("orderedAt", "desc");

  if (status) {
    ordersQuery = ordersQuery.where("orderStatus", "==", status);
  }

  if (startAfterDoc) {
    const lastDoc = await db.collection("orders").doc(startAfterDoc).get();
    if (lastDoc.exists) {
      ordersQuery = ordersQuery.startAfter(lastDoc);
    }
  }

  ordersQuery = ordersQuery.limit(Math.min(queryLimit, 100));

  const snapshot = await ordersQuery.get();
  const orders = await Promise.all(
    snapshot.docs.map(async (orderDoc) => {
      const orderData = orderDoc.data();
      let userName = "N/A";
      let userPhone = "N/A";

      if (orderData.userId) {
        try {
          const userDoc = await db.collection("users").doc(orderData.userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            userName = userData.name || userData.email || "N/A";
            userPhone = userData.phone || "N/A";
          }
        } catch (err) {
          // Ignore user fetch errors
        }
      }

      // Convert Firestore timestamps to ISO strings for frontend
      const formatTimestamp = (ts) => {
        if (!ts) return null;
        if (ts.toDate) return ts.toDate().toISOString();
        if (ts instanceof Date) return ts.toISOString();
        return ts;
      };

      return {
        id: orderDoc.id,
        ...orderData,
        userName,
        userPhone,
        createdAt: formatTimestamp(orderData.orderedAt),
        orderedAt: formatTimestamp(orderData.orderedAt),
        estimatedDeliveryDate: formatTimestamp(orderData.estimatedDeliveryDate),
        confirmedAt: formatTimestamp(orderData.confirmedAt),
        deliveredAt: formatTimestamp(orderData.deliveredAt),
        status: orderData.orderStatus,
        totalAmount: orderData.orderSummary?.totalAmount || 0,
      };
    })
  );

  return { orders, count: orders.length };
});

/**
 * Get orders for the authenticated user
 */
exports.getUserOrders = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { limit = 20, startAfterDoc, status } = request.data || {};

  let query = db.collection("orders")
    .where("userId", "==", request.auth.uid)
    .orderBy("orderedAt", "desc");

  if (status) {
    query = query.where("orderStatus", "==", status);
  }

  if (startAfterDoc) {
    const lastDoc = await db.collection("orders").doc(startAfterDoc).get();
    if (lastDoc.exists) {
      query = query.startAfter(lastDoc);
    }
  }

  query = query.limit(Math.min(limit, 50));

  const snapshot = await query.get();
  const orders = snapshot.docs.map((doc) => ({
    docId: doc.id,
    ...doc.data(),
  }));

  return { orders, count: orders.length };
});

/**
 * Get order details by document ID
 */
exports.getOrderDetails = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { orderDocId } = request.data;
  if (!orderDocId) {
    throw new HttpsError("invalid-argument", "orderDocId is required.");
  }

  const orderDoc = await db.collection("orders").doc(orderDocId).get();

  if (!orderDoc.exists) {
    throw new HttpsError("not-found", "Order not found.");
  }

  const order = orderDoc.data();

  // Only the order owner or an admin can view details
  if (order.userId !== request.auth.uid) {
    const adminDoc = await db.collection("admins").doc(request.auth.uid).get();
    if (!adminDoc.exists || !adminDoc.data().isActive) {
      throw new HttpsError("permission-denied", "You can only view your own orders.");
    }
  }

  return { docId: orderDoc.id, ...order };
});
