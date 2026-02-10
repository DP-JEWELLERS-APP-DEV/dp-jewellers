const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { logActivity } = require("./activityLog");

const db = admin.firestore();

// Verify admin access
async function verifyAdmin(auth) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const adminDoc = await db.collection("admins").doc(auth.uid).get();
  if (!adminDoc.exists || !adminDoc.data().isActive) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  return adminDoc.data();
}

/**
 * List all stores
 */
exports.listStores = onCall({ region: "asia-south1" }, async (request) => {
  await verifyAdmin(request.auth);

  const snapshot = await db.collection("stores")
    .orderBy("name", "asc")
    .get();

  const stores = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return { stores };
});

/**
 * Get active stores (for mobile app)
 */
exports.getActiveStores = onCall({ region: "asia-south1" }, async (_request) => {
  const snapshot = await db.collection("stores")
    .where("isActive", "==", true)
    .orderBy("name", "asc")
    .get();

  const stores = snapshot.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name,
    address: doc.data().address,
    city: doc.data().city,
    state: doc.data().state,
    pincode: doc.data().pincode,
    phone: doc.data().phone,
    openingHours: doc.data().openingHours,
    isPrimary: doc.data().isPrimary || false,
  }));

  return { stores };
});

/**
 * Create a new store
 */
exports.createStore = onCall({ region: "asia-south1" }, async (request) => {
  const adminData = await verifyAdmin(request.auth);

  const { name, address, city, state, pincode, phone, email, openingHours, isActive, isPrimary } = request.data;

  if (!name || !address || !city) {
    throw new HttpsError("invalid-argument", "Name, address, and city are required.");
  }

  // If setting as primary, unset other primary stores
  if (isPrimary) {
    const primaryStores = await db.collection("stores").where("isPrimary", "==", true).get();
    const batch = db.batch();
    primaryStores.forEach((doc) => {
      batch.update(doc.ref, { isPrimary: false });
    });
    await batch.commit();
  }

  const storeData = {
    name,
    address,
    city,
    state: state || "",
    pincode: pincode || "",
    phone: phone || "",
    email: email || "",
    openingHours: openingHours || "",
    isActive: isActive !== false,
    isPrimary: isPrimary || false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: request.auth.uid,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection("stores").add(storeData);

  logActivity({ module: "stores", action: "create", entityId: docRef.id, entityName: name, performedBy: request.auth.uid, performedByEmail: adminData.email, performedByRole: adminData.role });

  return { storeId: docRef.id, message: "Store created successfully." };
});

/**
 * Update a store
 */
exports.updateStore = onCall({ region: "asia-south1" }, async (request) => {
  const adminData = await verifyAdmin(request.auth);

  const { storeId, name, address, city, state, pincode, phone, email, openingHours, isActive, isPrimary } = request.data;

  if (!storeId) {
    throw new HttpsError("invalid-argument", "storeId is required.");
  }

  const storeDoc = await db.collection("stores").doc(storeId).get();
  if (!storeDoc.exists) {
    throw new HttpsError("not-found", "Store not found.");
  }

  // If setting as primary, unset other primary stores
  if (isPrimary && !storeDoc.data().isPrimary) {
    const primaryStores = await db.collection("stores").where("isPrimary", "==", true).get();
    const batch = db.batch();
    primaryStores.forEach((doc) => {
      if (doc.id !== storeId) {
        batch.update(doc.ref, { isPrimary: false });
      }
    });
    await batch.commit();
  }

  const updateData = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (name !== undefined) updateData.name = name;
  if (address !== undefined) updateData.address = address;
  if (city !== undefined) updateData.city = city;
  if (state !== undefined) updateData.state = state;
  if (pincode !== undefined) updateData.pincode = pincode;
  if (phone !== undefined) updateData.phone = phone;
  if (email !== undefined) updateData.email = email;
  if (openingHours !== undefined) updateData.openingHours = openingHours;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (isPrimary !== undefined) updateData.isPrimary = isPrimary;

  await db.collection("stores").doc(storeId).update(updateData);

  logActivity({ module: "stores", action: "update", entityId: storeId, entityName: storeDoc.data().name || storeId, performedBy: request.auth.uid, performedByEmail: adminData.email, performedByRole: adminData.role, details: { changedFields: Object.keys(updateData).filter(k => k !== "updatedAt") } });

  return { storeId, message: "Store updated successfully." };
});

/**
 * Delete a store
 */
exports.deleteStore = onCall({ region: "asia-south1" }, async (request) => {
  const adminData = await verifyAdmin(request.auth);

  const { storeId } = request.data;

  if (!storeId) {
    throw new HttpsError("invalid-argument", "storeId is required.");
  }

  const storeDoc = await db.collection("stores").doc(storeId).get();
  if (!storeDoc.exists) {
    throw new HttpsError("not-found", "Store not found.");
  }

  await db.collection("stores").doc(storeId).delete();

  logActivity({ module: "stores", action: "delete", entityId: storeId, entityName: storeDoc.data().name || storeId, performedBy: request.auth.uid, performedByEmail: adminData.email, performedByRole: adminData.role });

  return { storeId, message: "Store deleted successfully." };
});
