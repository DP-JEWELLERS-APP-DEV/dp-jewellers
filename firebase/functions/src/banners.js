const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const db = admin.firestore();
const BANNERS = "banners";
const PRODUCTS = "products";
const MAX_BANNERS = 5;

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
      throw new HttpsError("permission-denied", "You do not have permission to manage banners.");
    }
  }
  return adminData;
}

/**
 * List banners (admin: all banners + categories, public: active only)
 */
exports.listBanners = onCall({ region: "asia-south1" }, async (request) => {
  await verifyAdminWithPermission(request.auth);

  const snapshot = await db.collection(BANNERS)
    .orderBy("displayOrder", "asc")
    .get();

  const banners = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Also fetch available categories from active products
  const categoriesSnapshot = await db.collection(PRODUCTS)
    .where("isActive", "==", true)
    .select("category")
    .get();

  const categoriesSet = new Set();
  categoriesSnapshot.docs.forEach((doc) => {
    const category = doc.data().category;
    if (category) {
      categoriesSet.add(category);
    }
  });

  const categories = Array.from(categoriesSet).sort();

  return { banners, categories };
});

/**
 * Create or update a banner
 */
exports.saveBanner = onCall({ region: "asia-south1" }, async (request) => {
  await verifyAdminWithPermission(request.auth);

  const { bannerId, title, imageUrl, linkType, linkTarget, displayOrder, isActive } = request.data;

  if (!title || !imageUrl) {
    throw new HttpsError("invalid-argument", "Title and image are required.");
  }

  if (!linkType || !["category", "search"].includes(linkType)) {
    throw new HttpsError("invalid-argument", "Link type must be 'category' or 'search'.");
  }

  if (linkType === "category" && !linkTarget) {
    throw new HttpsError("invalid-argument", "Category is required when link type is 'category'.");
  }

  const order = Number(displayOrder) || 1;
  if (order < 1 || order > MAX_BANNERS) {
    throw new HttpsError("invalid-argument", `Display order must be between 1 and ${MAX_BANNERS}.`);
  }

  // If creating a new banner, enforce max limit
  if (!bannerId) {
    const existingCount = await db.collection(BANNERS).count().get();
    if (existingCount.data().count >= MAX_BANNERS) {
      throw new HttpsError("failed-precondition", `Maximum ${MAX_BANNERS} banners allowed. Delete an existing banner first.`);
    }
  }

  const bannerData = {
    title,
    imageUrl,
    linkType,
    linkTarget: linkType === "category" ? linkTarget : "",
    displayOrder: order,
    isActive: isActive !== false,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (bannerId) {
    // Update existing banner
    const bannerDoc = await db.collection(BANNERS).doc(bannerId).get();
    if (!bannerDoc.exists) {
      throw new HttpsError("not-found", "Banner not found.");
    }
    await db.collection(BANNERS).doc(bannerId).update(bannerData);
    return { bannerId, message: "Banner updated successfully." };
  } else {
    // Create new banner
    bannerData.createdAt = admin.firestore.FieldValue.serverTimestamp();
    bannerData.createdBy = request.auth.uid;
    const docRef = await db.collection(BANNERS).add(bannerData);
    return { bannerId: docRef.id, message: "Banner created successfully." };
  }
});

/**
 * Delete a banner
 */
exports.deleteBanner = onCall({ region: "asia-south1" }, async (request) => {
  await verifyAdminWithPermission(request.auth);

  const { bannerId } = request.data;

  if (!bannerId) {
    throw new HttpsError("invalid-argument", "bannerId is required.");
  }

  const bannerDoc = await db.collection(BANNERS).doc(bannerId).get();
  if (!bannerDoc.exists) {
    throw new HttpsError("not-found", "Banner not found.");
  }

  await db.collection(BANNERS).doc(bannerId).delete();

  return { bannerId, message: "Banner deleted successfully." };
});
