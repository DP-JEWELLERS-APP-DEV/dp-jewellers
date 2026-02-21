const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { _calculateVariantPriceInternal, _computePriceRange, _getDefaultPricing } = require("./priceCalculation");
const { requiresApproval } = require("./approvalUtils");
const { logActivity } = require("./activityLog");

const db = admin.firestore();
const PRODUCTS = "products";

// Verify the caller is an admin with product permissions
async function verifyProductAdmin(auth) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const adminDoc = await db.collection("admins").doc(auth.uid).get();
  if (!adminDoc.exists || !adminDoc.data().isActive) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  const data = adminDoc.data();
  if (data.role !== "super_admin" && !data.permissions?.manageProducts) {
    throw new HttpsError("permission-denied", "Product management permission required.");
  }
  return data;
}

/**
 * Generate a unique product code: DP-{CAT}-{4 digits}
 */
exports.generateProductCode = onCall({ region: "asia-south1" }, async (request) => {
  await verifyProductAdmin(request.auth);

  const { category } = request.data;
  if (!category) {
    throw new HttpsError("invalid-argument", "category is required.");
  }

  const catMap = {
    Ring: "RNG", Necklace: "NKL", Earring: "ERG", Bangle: "BNG",
    Bracelet: "BRC", Pendant: "PND", Chain: "CHN", Anklet: "ANK",
    Mangalsutra: "MNG", Kada: "KDA", Nosering: "NSR",
  };
  const prefix = `DP-${catMap[category] || category.slice(0, 3).toUpperCase()}`;

  const snapshot = await db.collection(PRODUCTS)
    .where("productCode", ">=", prefix)
    .where("productCode", "<=", prefix + "\uf8ff")
    .orderBy("productCode", "desc")
    .limit(1)
    .get();

  let nextNum = 1;
  if (!snapshot.empty) {
    const lastCode = snapshot.docs[0].data().productCode;
    const parts = lastCode.split("-");
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return { productCode: `${prefix}-${String(nextNum).padStart(4, "0")}` };
});

/**
 * Create a new product
 */
exports.createProduct = onCall({ region: "asia-south1" }, async (request) => {
  const adminData = await verifyProductAdmin(request.auth);

  const data = request.data;

  if (!data.name || !data.category || !data.productCode) {
    throw new HttpsError("invalid-argument", "name, category, and productCode are required.");
  }

  // Check for duplicate productCode
  const existing = await db.collection(PRODUCTS)
    .where("productCode", "==", data.productCode)
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new HttpsError("already-exists", `Product code ${data.productCode} already exists.`);
  }

  const product = {
    productCode: data.productCode,
    name: data.name,
    description: data.description || "",
    category: data.category,
    subCategory: data.subCategory || "",
    images: data.images || [],
    diamond: data.diamond || { hasDiamond: false },
    gemstones: data.gemstones || [],
    dimensions: data.dimensions || {},
    tax: data.tax || {},
    certifications: data.certifications || {},
    policies: data.policies || {
      freeShipping: true,
      cashOnDelivery: false,
      tryAtHome: false,
      freeReturns: true,
      returnWindowDays: 30,
      exchangeAllowed: true,
      lifetimeExchange: true,
      buybackAvailable: true,
      resizable: data.category === "ring",
      customizable: false,
    },
    collections: data.collections || [],
    tags: data.tags || [],
    inventory: data.inventory || {
      inStock: true,
      quantity: 1,
      lowStockThreshold: 2,
      preOrder: false,
      estimatedDeliveryDays: 7,
    },
    featured: data.featured || false,
    bestseller: data.bestseller || false,
    newArrival: data.newArrival !== undefined ? data.newArrival : true,
    displayOrder: data.displayOrder || 0,
    status: data.status || "active",
    createdBy: request.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    isActive: !data.status || data.status === "active" || data.status === "coming_soon",
    viewCount: 0,
    purchaseCount: 0,
  };

  // Store configurator
  if (data.configurator) {
    product.configurator = data.configurator;
  }

  // Compute pricing and priceRange from configurator
  const [ratesDoc, taxDoc, makingChargesDoc] = await Promise.all([
    db.collection("metalRates").doc("current").get(),
    db.collection("taxSettings").doc("current").get(),
    db.collection("makingCharges").doc("current").get(),
  ]);
  const rates = ratesDoc.exists ? ratesDoc.data() : {};
  const taxSettings = taxDoc.exists ? taxDoc.data() : { gst: { jewelry: 3 } };
  const makingChargesConfig = makingChargesDoc.exists ? makingChargesDoc.data() : {};

  product.pricing = _getDefaultPricing(product, rates, taxSettings, makingChargesConfig) || {};
  product.priceRange = _computePriceRange(product, rates, taxSettings, makingChargesConfig);

  if (requiresApproval(adminData)) {
    // Create product in pending state (not visible to customers)
    const originalStatus = product.status;
    product.isActive = false;
    product.status = "pending_approval";
    product.approvalStatus = "pending_approval";

    const docRef = await db.collection(PRODUCTS).add(product);

    // Create the pending approval entry
    await db.collection("pendingApprovals").add({
      entityType: "product",
      actionType: "create",
      entityId: docRef.id,
      entityName: product.name,
      proposedChanges: { originalStatus: originalStatus || "active" },
      previousState: null,
      status: "pending",
      submittedBy: request.auth.uid,
      submittedByEmail: adminData.email,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
    });

    logActivity({ module: "products", action: "create", entityId: docRef.id, entityName: data.name, performedBy: request.auth.uid, performedByEmail: adminData.email, performedByRole: adminData.role, details: { productCode: data.productCode, category: data.category, pendingApproval: true } });

    return {
      productId: docRef.id,
      message: "Product created and submitted for approval. It will be visible once approved.",
      pendingApproval: true,
    };
  }

  const docRef = await db.collection(PRODUCTS).add(product);

  logActivity({ module: "products", action: "create", entityId: docRef.id, entityName: data.name, performedBy: request.auth.uid, performedByEmail: adminData.email, performedByRole: adminData.role, details: { productCode: data.productCode, category: data.category } });

  return { productId: docRef.id, message: "Product created successfully." };
});

/**
 * Update an existing product
 */
exports.updateProduct = onCall({ region: "asia-south1" }, async (request) => {
  const adminData = await verifyProductAdmin(request.auth);

  const { productId, ...updateData } = request.data;

  if (!productId) {
    throw new HttpsError("invalid-argument", "productId is required.");
  }

  const productRef = db.collection(PRODUCTS).doc(productId);
  const productDoc = await productRef.get();

  if (!productDoc.exists) {
    throw new HttpsError("not-found", "Product not found.");
  }

  const existingData = productDoc.data();

  // Sync isActive with status if status changed
  if (updateData.status) {
    updateData.isActive = updateData.status === "active" || updateData.status === "coming_soon";
  }

  // Always recalculate pricing from configurator
  const finalConfigurator = updateData.configurator || existingData.configurator;
  const mergedProduct = { ...existingData, ...updateData, configurator: finalConfigurator };
  const [ratesDoc, taxDoc, makingChargesDoc] = await Promise.all([
    db.collection("metalRates").doc("current").get(),
    db.collection("taxSettings").doc("current").get(),
    db.collection("makingCharges").doc("current").get(),
  ]);
  const rates = ratesDoc.exists ? ratesDoc.data() : {};
  const taxSettings = taxDoc.exists ? taxDoc.data() : { gst: { jewelry: 3 } };
  const makingChargesConfig = makingChargesDoc.exists ? makingChargesDoc.data() : {};
  updateData.pricing = _getDefaultPricing(mergedProduct, rates, taxSettings, makingChargesConfig) || existingData.pricing;
  updateData.priceRange = _computePriceRange(mergedProduct, rates, taxSettings, makingChargesConfig);

  if (requiresApproval(adminData)) {
    // Store changes in pendingApprovals only — live product unchanged
    await db.collection("pendingApprovals").add({
      entityType: "product",
      actionType: "update",
      entityId: productId,
      entityName: existingData.name || productId,
      proposedChanges: updateData,
      previousState: existingData,
      status: "pending",
      submittedBy: request.auth.uid,
      submittedByEmail: adminData.email,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
    });

    // Mark the live product as having a pending change
    await productRef.update({
      approvalStatus: "pending_update",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logActivity({ module: "products", action: "update", entityId: productId, entityName: existingData.name, performedBy: request.auth.uid, performedByEmail: adminData.email, performedByRole: adminData.role, details: { pendingApproval: true, changedFields: Object.keys(updateData) } });

    return {
      productId,
      message: "Changes submitted for approval. The live product is unchanged until approved.",
      pendingApproval: true,
    };
  }

  updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  await productRef.update(updateData);

  logActivity({ module: "products", action: "update", entityId: productId, entityName: existingData.name, performedBy: request.auth.uid, performedByEmail: adminData.email, performedByRole: adminData.role, details: { changedFields: Object.keys(updateData).filter(k => k !== "updatedAt") } });

  return { productId, message: "Product updated successfully." };
});

/**
 * Archive a product (soft delete)
 */
exports.deleteProduct = onCall({ region: "asia-south1" }, async (request) => {
  const adminData = await verifyProductAdmin(request.auth);

  const { productId } = request.data;
  if (!productId) {
    throw new HttpsError("invalid-argument", "productId is required.");
  }

  const productRef = db.collection(PRODUCTS).doc(productId);
  const productDoc = await productRef.get();

  if (!productDoc.exists) {
    throw new HttpsError("not-found", "Product not found.");
  }

  if (requiresApproval(adminData)) {
    await db.collection("pendingApprovals").add({
      entityType: "product",
      actionType: "archive",
      entityId: productId,
      entityName: productDoc.data().name || productId,
      proposedChanges: { status: "archived", isActive: false },
      previousState: { status: productDoc.data().status, isActive: productDoc.data().isActive },
      status: "pending",
      submittedBy: request.auth.uid,
      submittedByEmail: adminData.email,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
    });

    logActivity({ module: "products", action: "archive", entityId: productId, entityName: productDoc.data().name, performedBy: request.auth.uid, performedByEmail: adminData.email, performedByRole: adminData.role, details: { pendingApproval: true } });

    return {
      productId,
      message: "Archive request submitted for approval.",
      pendingApproval: true,
    };
  }

  await productRef.update({
    status: "archived",
    isActive: false,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  logActivity({ module: "products", action: "archive", entityId: productId, entityName: productDoc.data().name, performedBy: request.auth.uid, performedByEmail: adminData.email, performedByRole: adminData.role });

  return { productId, message: "Product archived successfully." };
});

/**
 * Restore an archived product
 */
exports.restoreProduct = onCall({ region: "asia-south1" }, async (request) => {
  const adminData = await verifyProductAdmin(request.auth);

  const { productId } = request.data;
  if (!productId) {
    throw new HttpsError("invalid-argument", "productId is required.");
  }

  const productRef = db.collection(PRODUCTS).doc(productId);
  const productDoc = await productRef.get();

  if (!productDoc.exists) {
    throw new HttpsError("not-found", "Product not found.");
  }

  if (requiresApproval(adminData)) {
    await db.collection("pendingApprovals").add({
      entityType: "product",
      actionType: "restore",
      entityId: productId,
      entityName: productDoc.data().name || productId,
      proposedChanges: { status: "active", isActive: true },
      previousState: { status: productDoc.data().status, isActive: productDoc.data().isActive },
      status: "pending",
      submittedBy: request.auth.uid,
      submittedByEmail: adminData.email,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
    });

    logActivity({ module: "products", action: "restore", entityId: productId, entityName: productDoc.data().name, performedBy: request.auth.uid, performedByEmail: adminData.email, performedByRole: adminData.role, details: { pendingApproval: true } });

    return {
      productId,
      message: "Restore request submitted for approval.",
      pendingApproval: true,
    };
  }

  await productRef.update({
    status: "active",
    isActive: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  logActivity({ module: "products", action: "restore", entityId: productId, entityName: productDoc.data().name, performedBy: request.auth.uid, performedByEmail: adminData.email, performedByRole: adminData.role });

  return { productId, message: "Product restored successfully." };
});

/**
 * Get a single product by ID
 */
exports.getProduct = onCall({ region: "asia-south1" }, async (request) => {
  const { productId } = request.data;
  if (!productId) {
    throw new HttpsError("invalid-argument", "productId is required.");
  }

  const productDoc = await db.collection(PRODUCTS).doc(productId).get();

  if (!productDoc.exists) {
    throw new HttpsError("not-found", "Product not found.");
  }

  const product = productDoc.data();

  // Non-admins can only see active products
  if (!product.isActive) {
    if (!request.auth) {
      throw new HttpsError("not-found", "Product not found.");
    }
    const adminDoc = await db.collection("admins").doc(request.auth.uid).get();
    if (!adminDoc.exists || !adminDoc.data().isActive) {
      throw new HttpsError("not-found", "Product not found.");
    }
  }

  return { productId: productDoc.id, ...product };
});

/**
 * List products with filters and pagination
 */
exports.listProducts = onCall({ region: "asia-south1" }, async (request) => {
  const {
    category,
    subCategory,
    minPrice,
    maxPrice,
    metalType,
    featured,
    bestseller,
    newArrival,
    collection,
    tag,
    includeAll,
    sortBy = "createdAt",
    sortOrder = "desc",
    limit = 20,
    startAfterDoc,
  } = request.data || {};

  try {
    let showAll = false;
    if (includeAll && request.auth) {
      const adminDoc = await db.collection("admins").doc(request.auth.uid).get();
      if (adminDoc.exists && adminDoc.data().isActive) {
        showAll = true;
      }
    }

    let query = showAll
      ? db.collection(PRODUCTS)
      : db.collection(PRODUCTS).where("isActive", "==", true);

    if (category) query = query.where("category", "==", category);
    if (subCategory) query = query.where("subCategory", "==", subCategory);
    if (featured) query = query.where("featured", "==", true);
    if (bestseller) query = query.where("bestseller", "==", true);
    if (newArrival) query = query.where("newArrival", "==", true);
    if (collection) query = query.where("collections", "array-contains", collection);
    if (tag) query = query.where("tags", "array-contains", tag);

    // Sort (InMemory to avoid complex index requirements)
    // const validSortFields = ["createdAt", "pricing.finalPrice", "displayOrder", "purchaseCount"];
    // const field = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    // query = query.orderBy(field, sortOrder === "asc" ? "asc" : "desc");

    // Pagination
    if (startAfterDoc) {
      const lastDoc = await db.collection(PRODUCTS).doc(startAfterDoc).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    query = query.limit(Math.min(limit, 50));

    const snapshot = await query.get();
    const products = snapshot.docs.map((doc) => ({
      productId: doc.id,
      ...doc.data(),
    }));

    let filtered = products;
    if (minPrice) {
      filtered = filtered.filter((p) => (p.pricing?.finalPrice || 0) >= minPrice);
    }
    if (maxPrice) {
      filtered = filtered.filter((p) => (p.pricing?.finalPrice || 0) <= maxPrice);
    }

    // Perform In-Memory Sort
    const validSortFields = ["createdAt", "pricing.finalPrice", "displayOrder", "purchaseCount"];
    const field = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    filtered.sort((a, b) => {
      let valA = field.includes('.') ? field.split('.').reduce((o, i) => o[i], a) : a[field];
      let valB = field.includes('.') ? field.split('.').reduce((o, i) => o[i], b) : b[field];

      // Handle dates
      if (valA && valA.toDate) valA = valA.toDate();
      if (valB && valB.toDate) valB = valB.toDate();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return {
      products: filtered,
      count: filtered.length,
      lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null,
    };
  } catch (err) {
    logger.error("listProducts failed", err);
    throw new HttpsError("unknown", "Failed to list products. Please try again.");
  }
});

