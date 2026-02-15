const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const { logActivity } = require("./activityLog");
const { _calculateVariantPriceInternal, _normalizeConfigurator } = require("./priceCalculation");

function getRazorpayInstance() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

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
exports.createOrder = onCall({ region: "asia-south1", secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"] }, async (request) => {
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

    const unitPrice = itemPricing?.finalPrice || itemPricing?.price || 0;
    if (!unitPrice || unitPrice <= 0) {
      throw new HttpsError("failed-precondition", `Could not calculate price for ${product.name}. Please contact support.`);
    }
    const itemTotal = unitPrice * (item.quantity || 1);
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
        metalValue: itemPricing.metalValue || 0,
        diamondValue: itemPricing.diamondValue || 0,
        makingCharges: itemPricing.makingChargeAmount || 0,
        wastageCharges: itemPricing.wastageChargeAmount || 0,
        otherCharges: (itemPricing.stoneSettingCharges || 0) + (itemPricing.designCharges || 0),
        subtotal: itemPricing.subtotal || unitPrice,
        discount: itemPricing.discount || 0,
        tax: itemPricing.taxAmount || 0,
        itemTotal: unitPrice,
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

  // Create Razorpay order
  let razorpayOrderId = null;
  try {
    const razorpay = getRazorpayInstance();
    const amountForPayment = partialPayment && deliveryType === "store_pickup"
      ? partialPayment.amountPaid
      : totalAmount;

    const razorpayOrder = await razorpay.orders.create({
      amount: amountForPayment * 100, // paise
      currency: "INR",
      receipt: orderId,
      notes: { orderDocId: docRef.id, userId: request.auth.uid },
    });

    razorpayOrderId = razorpayOrder.id;

    // Save razorpayOrderId back to the Firestore order
    await docRef.update({ razorpayOrderId });
  } catch (err) {
    // Clean up the pending order if Razorpay fails
    await docRef.delete();
    console.error("Razorpay order creation failed:", err);
    throw new HttpsError("internal", "Failed to initiate payment. Please try again.");
  }

  return {
    orderDocId: docRef.id,
    orderId,
    totalAmount,
    razorpayOrderId,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    message: "Order initiated. Complete payment to confirm.",
  };
});

/**
 * Verify Razorpay payment signature and confirm the order
 */
exports.verifyPayment = onCall({ region: "asia-south1", secrets: ["RAZORPAY_KEY_SECRET"] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  const { orderDocId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = request.data;

  if (!orderDocId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
    throw new HttpsError("invalid-argument", "Missing payment verification parameters.");
  }

  // Verify HMAC signature
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    throw new HttpsError("invalid-argument", "Payment verification failed. Invalid signature.");
  }

  // Fetch and validate the order
  const orderRef = db.collection("orders").doc(orderDocId);
  const orderDoc = await orderRef.get();

  if (!orderDoc.exists) {
    throw new HttpsError("not-found", "Order not found.");
  }

  const orderData = orderDoc.data();

  if (orderData.userId !== request.auth.uid) {
    throw new HttpsError("permission-denied", "You can only verify your own orders.");
  }

  if (orderData.paymentStatus === "paid") {
    // Already verified (idempotent)
    return { success: true, orderId: orderData.orderId, orderDocId };
  }

  // Update order as paid
  await orderRef.update({
    paymentStatus: "paid",
    paymentId: razorpayPaymentId,
    paymentGateway: "razorpay",
    orderStatus: "confirmed",
    confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
    trackingUpdates: admin.firestore.FieldValue.arrayUnion({
      status: "confirmed",
      timestamp: new Date().toISOString(),
      note: "Payment received. Order confirmed.",
    }),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Deduct inventory
  for (const item of orderData.items) {
    await db.collection("products").doc(item.productId).update({
      "inventory.quantity": admin.firestore.FieldValue.increment(-(item.quantity || 1)),
      purchaseCount: admin.firestore.FieldValue.increment(item.quantity || 1),
    });
  }

  // Clear user's cart
  await db.collection("users").doc(request.auth.uid).update({ cart: [] });

  return { success: true, orderId: orderData.orderId, orderDocId };
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
