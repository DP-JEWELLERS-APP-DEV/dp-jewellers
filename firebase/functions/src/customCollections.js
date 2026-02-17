const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { requiresApproval } = require("./approvalUtils");
const { logActivity } = require("./activityLog");

const db = admin.firestore();
const COLLECTIONS = "customCollections";
const PRODUCTS = "products";

// Verify admin access with managePromotions permission
async function verifyAdminWithPermission(auth) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const adminDoc = await db.collection("admins").doc(auth.uid).get();
  if (!adminDoc.exists || !adminDoc.data().isActive) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  const adminData = adminDoc.data();
  const role = adminData.role || "editor";
  if (role !== "super_admin") {
    const permissions = adminData.permissions || {};
    if (!permissions.managePromotions) {
      throw new HttpsError("permission-denied", "You do not have permission to manage collections.");
    }
  }
  return adminData;
}

/**
 * List all custom collections (admin only)
 */
exports.listCustomCollections = onCall({ region: "asia-south1" }, async (request) => {
  await verifyAdminWithPermission(request.auth);

  const snapshot = await db.collection(COLLECTIONS)
    .orderBy("createdAt", "desc")
    .get();

  const collections = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return { collections };
});

/**
 * Create or update a custom collection
 */
exports.saveCustomCollection = onCall({ region: "asia-south1" }, async (request) => {
  const callerData = await verifyAdminWithPermission(request.auth);

  const { collectionId, name, productIds, isActive } = request.data;

  if (!name || !String(name).trim()) {
    throw new HttpsError("invalid-argument", "Collection name is required.");
  }

  if (!Array.isArray(productIds) || productIds.length === 0) {
    throw new HttpsError("invalid-argument", "At least one product must be selected.");
  }

  const collectionData = {
    name: String(name).trim(),
    productIds: productIds.map(String),
    isActive: isActive !== false,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (requiresApproval(callerData)) {
    const isUpdate = !!collectionId;
    let previousState = null;
    if (isUpdate) {
      const existingDoc = await db.collection(COLLECTIONS).doc(collectionId).get();
      if (!existingDoc.exists) {
        throw new HttpsError("not-found", "Collection not found.");
      }
      previousState = existingDoc.data();
    }

    const serializableData = { ...collectionData };
    delete serializableData.updatedAt;
    serializableData.createdBy = request.auth.uid;

    await db.collection("pendingApprovals").add({
      entityType: "customCollection",
      actionType: isUpdate ? "update" : "create",
      entityId: isUpdate ? collectionId : null,
      entityName: collectionData.name,
      proposedChanges: serializableData,
      previousState,
      status: "pending",
      submittedBy: request.auth.uid,
      submittedByEmail: callerData.email,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
    });

    logActivity({ module: "customCollections", action: isUpdate ? "update" : "create", entityId: isUpdate ? collectionId : "pending", entityName: collectionData.name, performedBy: request.auth.uid, performedByEmail: callerData.email, performedByRole: callerData.role, details: { pendingApproval: true } });

    return {
      message: isUpdate ? "Collection update submitted for approval." : "New collection submitted for approval.",
      pendingApproval: true,
    };
  }

  if (collectionId) {
    const existingDoc = await db.collection(COLLECTIONS).doc(collectionId).get();
    if (!existingDoc.exists) {
      throw new HttpsError("not-found", "Collection not found.");
    }
    await db.collection(COLLECTIONS).doc(collectionId).update(collectionData);
    logActivity({ module: "customCollections", action: "update", entityId: collectionId, entityName: collectionData.name, performedBy: request.auth.uid, performedByEmail: callerData.email, performedByRole: callerData.role });
    return { collectionId, message: "Collection updated successfully." };
  } else {
    collectionData.createdAt = admin.firestore.FieldValue.serverTimestamp();
    collectionData.createdBy = request.auth.uid;
    const docRef = await db.collection(COLLECTIONS).add(collectionData);
    logActivity({ module: "customCollections", action: "create", entityId: docRef.id, entityName: collectionData.name, performedBy: request.auth.uid, performedByEmail: callerData.email, performedByRole: callerData.role });
    return { collectionId: docRef.id, message: "Collection created successfully." };
  }
});

/**
 * Delete a custom collection
 */
exports.deleteCustomCollection = onCall({ region: "asia-south1" }, async (request) => {
  const callerData = await verifyAdminWithPermission(request.auth);

  const { collectionId } = request.data;

  if (!collectionId) {
    throw new HttpsError("invalid-argument", "collectionId is required.");
  }

  const collectionDoc = await db.collection(COLLECTIONS).doc(collectionId).get();
  if (!collectionDoc.exists) {
    throw new HttpsError("not-found", "Collection not found.");
  }

  if (requiresApproval(callerData)) {
    await db.collection("pendingApprovals").add({
      entityType: "customCollection",
      actionType: "delete",
      entityId: collectionId,
      entityName: collectionDoc.data().name || collectionId,
      proposedChanges: { deleted: true },
      previousState: collectionDoc.data(),
      status: "pending",
      submittedBy: request.auth.uid,
      submittedByEmail: callerData.email,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
    });

    logActivity({ module: "customCollections", action: "delete", entityId: collectionId, entityName: collectionDoc.data().name || collectionId, performedBy: request.auth.uid, performedByEmail: callerData.email, performedByRole: callerData.role, details: { pendingApproval: true } });

    return { message: "Collection deletion submitted for approval.", pendingApproval: true };
  }

  await db.collection(COLLECTIONS).doc(collectionId).delete();

  logActivity({ module: "customCollections", action: "delete", entityId: collectionId, entityName: collectionDoc.data().name || collectionId, performedBy: request.auth.uid, performedByEmail: callerData.email, performedByRole: callerData.role });

  return { collectionId, message: "Collection deleted successfully." };
});

/**
 * Get products for a custom collection (mobile / public)
 * No auth required — returns only active products in the collection.
 */
exports.getCustomCollectionProducts = onCall({ region: "asia-south1" }, async (request) => {
  const { collectionId } = request.data || {};

  if (!collectionId) {
    throw new HttpsError("invalid-argument", "collectionId is required.");
  }

  const collectionDoc = await db.collection(COLLECTIONS).doc(collectionId).get();
  if (!collectionDoc.exists) {
    throw new HttpsError("not-found", "Collection not found.");
  }

  const { productIds = [], name } = collectionDoc.data();

  if (productIds.length === 0) {
    return { products: [], collectionName: name };
  }

  // Firestore "in" query supports max 30 items per call
  const chunks = [];
  for (let i = 0; i < productIds.length; i += 30) {
    chunks.push(productIds.slice(i, i + 30));
  }

  const allDocs = [];
  for (const chunk of chunks) {
    const snapshot = await db.collection(PRODUCTS)
      .where(admin.firestore.FieldPath.documentId(), "in", chunk)
      .where("isActive", "==", true)
      .get();
    allDocs.push(...snapshot.docs);
  }

  // Preserve the order defined in the collection
  const docMap = {};
  allDocs.forEach((doc) => { docMap[doc.id] = doc; });

  const products = productIds
    .filter((id) => docMap[id])
    .map((id) => {
      const doc = docMap[id];
      const data = doc.data();
      return {
        productId: doc.id,
        name: data.name,
        category: data.category,
        image: data.images?.[0]?.url || "",
        finalPrice: data.priceRange?.defaultPrice || data.pricing?.finalPrice || 0,
        priceRange: data.priceRange || null,
        metalType: data.metal?.type || "",
      };
    });

  return { products, collectionName: name };
});
