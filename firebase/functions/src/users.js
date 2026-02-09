const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const db = admin.firestore();

// Verify admin with user management permissions
async function verifyUserAdmin(auth) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const adminDoc = await db.collection("admins").doc(auth.uid).get();
  if (!adminDoc.exists || !adminDoc.data().isActive) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  const data = adminDoc.data();
  if (data.role !== "super_admin" && !data.permissions?.manageUsers) {
    throw new HttpsError("permission-denied", "User management permission required.");
  }
  return data;
}

/**
 * List all users (admin only)
 */
exports.listUsers = onCall({ region: "asia-south1" }, async (request) => {
  await verifyUserAdmin(request.auth);

  const { limit: queryLimit = 50, startAfterDoc } = request.data || {};

  let usersQuery = db.collection("users")
    .orderBy("createdAt", "desc");

  if (startAfterDoc) {
    const lastDoc = await db.collection("users").doc(startAfterDoc).get();
    if (lastDoc.exists) {
      usersQuery = usersQuery.startAfter(lastDoc);
    }
  }

  usersQuery = usersQuery.limit(Math.min(queryLimit, 100));

  const snapshot = await usersQuery.get();
  const users = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return { users, count: users.length };
});

/**
 * Get user details with order history (admin only)
 */
exports.getUserDetails = onCall({ region: "asia-south1" }, async (request) => {
  await verifyUserAdmin(request.auth);

  const { userId } = request.data;
  if (!userId) {
    throw new HttpsError("invalid-argument", "userId is required.");
  }

  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found.");
  }

  // Fetch user orders
  const ordersSnapshot = await db.collection("orders")
    .where("userId", "==", userId)
    .orderBy("orderedAt", "desc")
    .limit(20)
    .get();

  const orders = ordersSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return {
    user: { id: userDoc.id, ...userDoc.data() },
    orders,
  };
});

/**
 * Update user details (admin only)
 */
exports.updateUser = onCall({ region: "asia-south1" }, async (request) => {
  await verifyUserAdmin(request.auth);

  const { userId, name, email, phone, address, isActive } = request.data;
  if (!userId) {
    throw new HttpsError("invalid-argument", "userId is required.");
  }

  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found.");
  }

  const updateData = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;
  if (address !== undefined) updateData.address = address;
  if (isActive !== undefined) updateData.isActive = isActive;

  await db.collection("users").doc(userId).update(updateData);

  return { userId, message: "User updated successfully." };
});

/**
 * Delete user (admin only) - soft delete by deactivating
 */
exports.deleteUser = onCall({ region: "asia-south1" }, async (request) => {
  await verifyUserAdmin(request.auth);

  const { userId } = request.data;
  if (!userId) {
    throw new HttpsError("invalid-argument", "userId is required.");
  }

  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found.");
  }

  await db.collection("users").doc(userId).update({
    isActive: false,
    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { userId, message: "User deactivated successfully." };
});

/**
 * Get dashboard stats (admin only)
 */
exports.getDashboardStats = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const adminDoc = await db.collection("admins").doc(request.auth.uid).get();
  if (!adminDoc.exists || !adminDoc.data().isActive) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }

  // Get today's start and this month's start timestamps
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [productsSnapshot, ordersSnapshot, pendingOrdersSnapshot, usersSnapshot, allProductsSnapshot] = await Promise.all([
    db.collection("products").where("isActive", "==", true).count().get(),
    db.collection("orders").count().get(),
    db.collection("orders").where("orderStatus", "==", "pending").count().get(),
    db.collection("users").count().get(),
    db.collection("products").get(),
  ]);

  // Category-wise and status-wise product breakdown
  const categoryWise = {};
  let outOfStockCount = 0;
  let totalAllProducts = 0;
  allProductsSnapshot.forEach((doc) => {
    const product = doc.data();
    totalAllProducts++;
    const cat = product.category || "Uncategorized";
    categoryWise[cat] = (categoryWise[cat] || 0) + 1;
    const status = product.status || (product.isActive !== false ? "active" : "inactive");
    if (status === "out_of_stock") outOfStockCount++;
  });

  // Get sales stats
  let todaySales = 0;
  let todayOrders = 0;
  let monthlySales = 0;
  let monthlyOrders = 0;

  try {
    // Today's orders
    const todayOrdersSnapshot = await db.collection("orders")
      .where("orderedAt", ">=", todayStart)
      .get();

    todayOrders = todayOrdersSnapshot.size;
    todayOrdersSnapshot.forEach((doc) => {
      const order = doc.data();
      todaySales += order.totalAmount || order.pricing?.finalPrice || 0;
    });

    // This month's orders
    const monthOrdersSnapshot = await db.collection("orders")
      .where("orderedAt", ">=", monthStart)
      .get();

    monthlyOrders = monthOrdersSnapshot.size;
    monthOrdersSnapshot.forEach((doc) => {
      const order = doc.data();
      monthlySales += order.totalAmount || order.pricing?.finalPrice || 0;
    });
  } catch (err) {
    console.error("Error fetching sales stats:", err);
  }

  return {
    totalProducts: productsSnapshot.data().count,
    totalAllProducts,
    outOfStockCount,
    categoryWise,
    totalOrders: ordersSnapshot.data().count,
    pendingOrders: pendingOrdersSnapshot.data().count,
    totalUsers: usersSnapshot.data().count,
    todaySales: Math.round(todaySales),
    todayOrders,
    monthlySales: Math.round(monthlySales),
    monthlyOrders,
  };
});
