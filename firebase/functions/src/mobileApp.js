const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { _calculateVariantPriceInternal } = require("./priceCalculation");

const db = admin.firestore();
const USERS = "users";
const PRODUCTS = "products";
const MAX_RECENT_ACTIVITY = 20;

function normalizeSearchTerm(term) {
  return String(term || "").trim().toLowerCase();
}

function mapProductDoc(doc) {
  const data = doc.data();
  return {
    productId: doc.id,
    name: data.name,
    category: data.category,
    image: data.images?.[0]?.url || "",
    finalPrice: data.priceRange?.defaultPrice || data.pricing?.finalPrice || 0,
    priceRange: data.priceRange || null,
    metalType: data.metal?.type || "",
    purchaseCount: data.purchaseCount || 0,
    isActive: data.isActive !== false,
  };
}

// Verify the caller is authenticated
function verifyAuth(auth) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  return auth;
}

// ============================================
// USER PROFILE MANAGEMENT
// ============================================

/**
 * Register a new user after Firebase Auth creates the account.
 * Creates a Firestore document in the users collection.
 */
exports.registerUser = onCall({ region: "asia-south1" }, async (request) => {
  verifyAuth(request.auth);

  const { name, email, phone } = request.data;

  if (!phone) {
    throw new HttpsError("invalid-argument", "phone is required.");
  }

  const safeName = name && String(name).trim() ? String(name).trim() : "Customer";
  const safeEmail = email ? String(email).trim() : "";

  const userRef = db.collection(USERS).doc(request.auth.uid);
  const existingUser = await userRef.get();

  if (existingUser.exists) {
    throw new HttpsError("already-exists", "User profile already exists.");
  }

  const userData = {
    name: safeName,
    email: safeEmail,
    phone,
    profilePicture: "",
    addresses: [],
    favorites: [],
    cart: [],
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await userRef.set(userData);

  return { userId: request.auth.uid, message: "User registered successfully." };
});

/**
 * Get the authenticated user's profile
 */
exports.getUserProfile = onCall({ region: "asia-south1" }, async (request) => {
  verifyAuth(request.auth);

  const userDoc = await db.collection(USERS).doc(request.auth.uid).get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User profile not found.");
  }

  return { userId: userDoc.id, ...userDoc.data() };
});

/**
 * Update the authenticated user's profile (name, phone, profilePicture)
 */
exports.updateUserProfile = onCall({ region: "asia-south1" }, async (request) => {
  verifyAuth(request.auth);

  const { name, phone, profilePicture } = request.data;

  const userRef = db.collection(USERS).doc(request.auth.uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User profile not found.");
  }

  const updateData = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (name !== undefined) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone;
  if (profilePicture !== undefined) updateData.profilePicture = profilePicture;

  await userRef.update(updateData);

  return { userId: request.auth.uid, message: "Profile updated successfully." };
});

/**
 * Track recent user activity (views, searches) for recommendations
 */
exports.trackUserActivity = onCall({ region: "asia-south1" }, async (request) => {
  verifyAuth(request.auth);

  const { type, productId, category, term } = request.data || {};

  if (!type || !["view", "search"].includes(type)) {
    throw new HttpsError("invalid-argument", "type must be 'view' or 'search'.");
  }

  const userRef = db.collection(USERS).doc(request.auth.uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User profile not found.");
  }

  const userData = userDoc.data() || {};
  const updates = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (type === "view") {
    if (!productId) {
      throw new HttpsError("invalid-argument", "productId is required for view activity.");
    }
    const existing = Array.isArray(userData.recentViews) ? userData.recentViews : [];
    const filtered = existing.filter((v) => String(v.productId) !== String(productId));
    const entry = {
      productId: String(productId),
      category: category ? String(category) : "",
      viewedAt: admin.firestore.Timestamp.now(),
    };
    updates.recentViews = [entry, ...filtered].slice(0, MAX_RECENT_ACTIVITY);
  } else if (type === "search") {
    const normalized = normalizeSearchTerm(term);
    if (!normalized) {
      throw new HttpsError("invalid-argument", "term is required for search activity.");
    }
    const existing = Array.isArray(userData.recentSearches) ? userData.recentSearches : [];
    const filtered = existing.filter((s) => normalizeSearchTerm(s.term) !== normalized);
    const entry = {
      term: normalized,
      searchedAt: admin.firestore.Timestamp.now(),
    };
    updates.recentSearches = [entry, ...filtered].slice(0, MAX_RECENT_ACTIVITY);
  }

  await userRef.update(updates);

  return { ok: true };
});

// ============================================
// CART MANAGEMENT
// ============================================

/**
 * Get cart items with enriched product details
 */
exports.getCart = onCall({ region: "asia-south1" }, async (request) => {
  verifyAuth(request.auth);

  const userDoc = await db.collection(USERS).doc(request.auth.uid).get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User profile not found.");
  }

  const cart = userDoc.data().cart || [];

  if (cart.length === 0) {
    return { cart: [], count: 0 };
  }

  // Check if any items have variant selections - if so, we need rates for recalculation
  const hasVariantItems = cart.some((item) => item.selectedPurity || item.selectedDiamondQuality);
  let rates = null;
  let taxSettings = null;
  let makingChargesConfig = null;

  if (hasVariantItems) {
    const [ratesDoc, taxDoc, makingChargesDoc] = await Promise.all([
      db.collection("metalRates").doc("current").get(),
      db.collection("taxSettings").doc("current").get(),
      db.collection("makingCharges").doc("current").get(),
    ]);
    rates = ratesDoc.exists ? ratesDoc.data() : {};
    taxSettings = taxDoc.exists ? taxDoc.data() : { gst: { jewelry: 3 } };
    makingChargesConfig = makingChargesDoc.exists ? makingChargesDoc.data() : {};
  }

  // Fetch product details for each cart item
  const enrichedCart = [];
  for (const item of cart) {
    const productDoc = await db.collection(PRODUCTS).doc(item.productId).get();
    if (productDoc.exists) {
      const product = productDoc.data();
      let finalPrice = product.pricing?.finalPrice || 0;

      // Recalculate price for variant selections on configurator-enabled products
      if (item.selectedPurity && product.configurator?.enabled && rates) {
        const variantPricing = _calculateVariantPriceInternal(
          product, rates, taxSettings, makingChargesConfig,
          item.selectedPurity, item.selectedDiamondQuality, item.size, item.selectedMetalType
        );
        finalPrice = variantPricing.finalPrice;
      }

      enrichedCart.push({
        productId: item.productId,
        size: item.size,
        selectedMetalType: item.selectedMetalType || null,
        selectedPurity: item.selectedPurity || null,
        selectedColor: item.selectedColor || null,
        selectedDiamondQuality: item.selectedDiamondQuality || null,
        quantity: item.quantity,
        addedAt: item.addedAt,
        name: product.name,
        image: product.images?.[0]?.url || "",
        finalPrice,
      });
    }
  }

  return { cart: enrichedCart, count: enrichedCart.length };
});

/**
 * Update cart: add, update quantity, remove, or clear
 */
exports.updateCart = onCall({ region: "asia-south1" }, async (request) => {
  verifyAuth(request.auth);

  const { action, productId, size, quantity, selectedMetalType, selectedPurity, selectedColor, selectedDiamondQuality } = request.data;

  if (!action) {
    throw new HttpsError("invalid-argument", "action is required.");
  }

  const validActions = ["add", "update", "remove", "clear"];
  if (!validActions.includes(action)) {
    throw new HttpsError("invalid-argument", `Invalid action. Must be one of: ${validActions.join(", ")}`);
  }

  if (action !== "clear" && !productId) {
    throw new HttpsError("invalid-argument", "productId is required for this action.");
  }

  const userRef = db.collection(USERS).doc(request.auth.uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User profile not found.");
  }

  let cart = userDoc.data().cart || [];

  // Match cart items by productId + size + variant selections
  const matchCartItem = (item) =>
    item.productId === productId &&
    item.size === (size || null) &&
    (item.selectedMetalType || null) === (selectedMetalType || null) &&
    (item.selectedPurity || null) === (selectedPurity || null) &&
    (item.selectedColor || null) === (selectedColor || null) &&
    (item.selectedDiamondQuality || null) === (selectedDiamondQuality || null);

  switch (action) {
    case "add": {
      // Verify product exists and is active
      const productDoc = await db.collection(PRODUCTS).doc(productId).get();
      if (!productDoc.exists || !productDoc.data().isActive) {
        throw new HttpsError("not-found", "Product not found or unavailable.");
      }

      const existingIndex = cart.findIndex(matchCartItem);
      if (existingIndex >= 0) {
        cart[existingIndex].quantity = (cart[existingIndex].quantity || 0) + (quantity || 1);
      } else {
        const cartItem = {
          productId,
          size: size || null,
          quantity: quantity || 1,
          addedAt: new Date().toISOString(),
        };

        // Store variant selections if provided
        if (selectedMetalType) cartItem.selectedMetalType = selectedMetalType;
        if (selectedPurity) cartItem.selectedPurity = selectedPurity;
        if (selectedColor) cartItem.selectedColor = selectedColor;
        if (selectedDiamondQuality) cartItem.selectedDiamondQuality = selectedDiamondQuality;

        cart.push(cartItem);
      }
      break;
    }

    case "update": {
      const updateIndex = cart.findIndex(matchCartItem);
      if (updateIndex === -1) {
        throw new HttpsError("not-found", "Item not found in cart.");
      }
      cart[updateIndex].quantity = quantity || 1;
      break;
    }

    case "remove": {
      const removeIndex = cart.findIndex(matchCartItem);
      if (removeIndex === -1) {
        throw new HttpsError("not-found", "Item not found in cart.");
      }
      cart.splice(removeIndex, 1);
      break;
    }

    case "clear": {
      cart = [];
      break;
    }
  }

  await userRef.update({
    cart,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { cart, count: cart.length, message: `Cart ${action} successful.` };
});

// ============================================
// FAVORITES / WISHLIST
// ============================================

/**
 * Get favorites with product details
 */
exports.getFavorites = onCall({ region: "asia-south1" }, async (request) => {
  verifyAuth(request.auth);

  const userDoc = await db.collection(USERS).doc(request.auth.uid).get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User profile not found.");
  }

  const favorites = userDoc.data().favorites || [];

  if (favorites.length === 0) {
    return { favorites: [], count: 0 };
  }

  // Fetch product details for each favorite
  const enrichedFavorites = [];
  for (const productId of favorites) {
    const productDoc = await db.collection(PRODUCTS).doc(productId).get();
    if (productDoc.exists) {
      const product = productDoc.data();
      enrichedFavorites.push({
        productId,
        name: product.name,
        image: product.images?.[0]?.url || "",
        finalPrice: product.pricing?.finalPrice || 0,
        category: product.category,
      });
    }
  }

  return { favorites: enrichedFavorites, count: enrichedFavorites.length };
});

/**
 * Update favorites: add or remove a product
 */
exports.updateFavorites = onCall({ region: "asia-south1" }, async (request) => {
  verifyAuth(request.auth);

  const { action, productId } = request.data;

  if (!action || !productId) {
    throw new HttpsError("invalid-argument", "action and productId are required.");
  }

  const validActions = ["add", "remove"];
  if (!validActions.includes(action)) {
    throw new HttpsError("invalid-argument", `Invalid action. Must be one of: ${validActions.join(", ")}`);
  }

  const userRef = db.collection(USERS).doc(request.auth.uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User profile not found.");
  }

  let favorites = userDoc.data().favorites || [];

  if (action === "add") {
    // Verify product exists
    const productDoc = await db.collection(PRODUCTS).doc(productId).get();
    if (!productDoc.exists || !productDoc.data().isActive) {
      throw new HttpsError("not-found", "Product not found or unavailable.");
    }

    if (!favorites.includes(productId)) {
      favorites.push(productId);
    }
  } else if (action === "remove") {
    favorites = favorites.filter((id) => id !== productId);
  }

  await userRef.update({
    favorites,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { favorites, count: favorites.length, message: `Favorite ${action} successful.` };
});

// ============================================
// ADDRESS MANAGEMENT
// ============================================

/**
 * Get all addresses for the authenticated user
 */
exports.getAddresses = onCall({ region: "asia-south1" }, async (request) => {
  verifyAuth(request.auth);

  const userDoc = await db.collection(USERS).doc(request.auth.uid).get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User profile not found.");
  }

  const addresses = userDoc.data().addresses || [];

  return { addresses, count: addresses.length };
});

/**
 * Manage addresses: add, update, delete, or set default
 */
exports.manageAddress = onCall({ region: "asia-south1" }, async (request) => {
  verifyAuth(request.auth);

  const { action, address, addressIndex } = request.data;

  if (!action) {
    throw new HttpsError("invalid-argument", "action is required.");
  }

  const validActions = ["add", "update", "delete", "setDefault"];
  if (!validActions.includes(action)) {
    throw new HttpsError("invalid-argument", `Invalid action. Must be one of: ${validActions.join(", ")}`);
  }

  const userRef = db.collection(USERS).doc(request.auth.uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User profile not found.");
  }

  let addresses = userDoc.data().addresses || [];

  const normalizeAddress = (payload = {}) => {
    const phone = payload.phone || payload.contactNumber || payload.mobileNo || "";
    const addressLine1 = payload.addressLine1 || payload.completeAddress || payload.address || "";
    const addressLine2 = payload.addressLine2 || payload.areaName || "";

    return {
      addressType: payload.addressType || "home",
      name: payload.name || "",
      phone,
      contactNumber: phone,
      addressLine1,
      addressLine2,
      areaName: addressLine2,
      city: payload.city || "",
      state: payload.state || "",
      pincode: payload.pincode || "",
      completeAddress: addressLine1,
      isDefault: Boolean(payload.isDefault),
    };
  };

  switch (action) {
    case "add": {
      if (!address) {
        throw new HttpsError("invalid-argument", "address object is required for add action.");
      }

      const normalized = normalizeAddress(address);
      const isDefault = addresses.length === 0 || normalized.isDefault;
      if (isDefault) {
        addresses = addresses.map((addr) => ({ ...addr, isDefault: false }));
      }

      const newAddress = {
        ...normalized,
        isDefault,
        createdAt: new Date().toISOString(),
      };

      addresses.push(newAddress);
      break;
    }

    case "update": {
      if (addressIndex === undefined || addressIndex < 0 || addressIndex >= addresses.length) {
        throw new HttpsError("invalid-argument", "Valid addressIndex is required for update action.");
      }
      if (!address) {
        throw new HttpsError("invalid-argument", "address object is required for update action.");
      }

      const normalized = normalizeAddress(address);
      const nextAddress = {
        ...addresses[addressIndex],
        ...normalized,
        createdAt: addresses[addressIndex].createdAt, // Preserve original createdAt
      };
      delete nextAddress.isDefault;
      addresses[addressIndex] = nextAddress;
      break;
    }

    case "delete": {
      if (addressIndex === undefined || addressIndex < 0 || addressIndex >= addresses.length) {
        throw new HttpsError("invalid-argument", "Valid addressIndex is required for delete action.");
      }

      const wasDefault = addresses[addressIndex].isDefault;
      addresses.splice(addressIndex, 1);

      // If deleted address was default and there are remaining addresses, set first as default
      if (wasDefault && addresses.length > 0) {
        addresses[0].isDefault = true;
      }
      break;
    }

    case "setDefault": {
      if (addressIndex === undefined || addressIndex < 0 || addressIndex >= addresses.length) {
        throw new HttpsError("invalid-argument", "Valid addressIndex is required for setDefault action.");
      }

      addresses = addresses.map((addr, idx) => ({
        ...addr,
        isDefault: idx === addressIndex,
      }));
      break;
    }
  }

  await userRef.update({
    addresses,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { addresses, count: addresses.length, message: `Address ${action} successful.` };
});

// ============================================
// PRODUCT SEARCH & BROWSING
// ============================================

/**
 * Search products with filters, sorting, and pagination (public)
 */
exports.searchProducts = onCall({ region: "asia-south1" }, async (request) => {
  const {
    query,
    category,
    material,
    minPrice,
    maxPrice,
    sortBy = "newest",
    limit = 20,
    startAfterDoc,
  } = request.data || {};

  let firestoreQuery = db.collection(PRODUCTS).where("isActive", "==", true);

  if (category) {
    firestoreQuery = firestoreQuery.where("category", "==", category);
  }

  if (material) {
    firestoreQuery = firestoreQuery.where("metal.type", "==", material);
  }

  // Apply sorting
  switch (sortBy) {
    case "price_asc":
      firestoreQuery = firestoreQuery.orderBy("pricing.finalPrice", "asc");
      break;
    case "price_desc":
      firestoreQuery = firestoreQuery.orderBy("pricing.finalPrice", "desc");
      break;
    case "popular":
      firestoreQuery = firestoreQuery.orderBy("purchaseCount", "desc");
      break;
    case "newest":
    default:
      firestoreQuery = firestoreQuery.orderBy("createdAt", "desc");
      break;
  }

  // Pagination
  if (startAfterDoc) {
    const lastDoc = await db.collection(PRODUCTS).doc(startAfterDoc).get();
    if (lastDoc.exists) {
      firestoreQuery = firestoreQuery.startAfter(lastDoc);
    }
  }

  firestoreQuery = firestoreQuery.limit(Math.min(limit, 50));

  const snapshot = await firestoreQuery.get();
  let products = snapshot.docs.map((doc) => {
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

  // Client-side text search filtering
  if (query) {
    const lowerQuery = query.toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.category.toLowerCase().includes(lowerQuery)
    );
  }

  // Client-side price filtering
  if (minPrice) {
    products = products.filter((p) => p.finalPrice >= minPrice);
  }
  if (maxPrice) {
    products = products.filter((p) => p.finalPrice <= maxPrice);
  }

  return {
    products,
    count: products.length,
    lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null,
  };
});

/**
 * Get products by category with pagination (public)
 */
exports.getProductsByCategory = onCall({ region: "asia-south1" }, async (request) => {
  const { category, limit = 20, startAfterDoc } = request.data || {};

  if (!category) {
    throw new HttpsError("invalid-argument", "category is required.");
  }

  let query = db.collection(PRODUCTS)
    .where("isActive", "==", true)
    .where("category", "==", category)
    .orderBy("createdAt", "desc");

  if (startAfterDoc) {
    const lastDoc = await db.collection(PRODUCTS).doc(startAfterDoc).get();
    if (lastDoc.exists) {
      query = query.startAfter(lastDoc);
    }
  }

  query = query.limit(Math.min(limit, 50));

  const snapshot = await query.get();
  const products = snapshot.docs.map((doc) => {
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

  return {
    products,
    count: products.length,
    lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null,
  };
});

/**
 * Get home page data: categories, featured products, popular products (public)
 */
exports.getHomePageData = onCall({ region: "asia-south1" }, async (_request) => {
  let featured = [];
  let popular = [];
  let categories = [];
  let banners = [];
  let recommended = [];

  try {
    const featuredSnapshot = await db.collection(PRODUCTS)
      .where("isActive", "==", true)
      .where("featured", "==", true)
      .limit(6)
      .get();

    featured = featuredSnapshot.docs.map(mapProductDoc);
  } catch (err) {
    console.error("getHomePageData: featured query failed", err);
  }

  try {
    const popularSnapshot = await db.collection(PRODUCTS)
      .where("isActive", "==", true)
      .orderBy("createdAt", "desc")
      .limit(8)
      .get();

    popular = popularSnapshot.docs.map(mapProductDoc);
  } catch (err) {
    console.error("getHomePageData: popular query failed", err);
  }

  try {
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

    categories = Array.from(categoriesSet).sort();
  } catch (err) {
    console.error("getHomePageData: categories query failed", err);
  }

  try {
    const bannersSnapshot = await db.collection("banners")
      .where("isActive", "==", true)
      .get();

    banners = bannersSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || "",
          imageUrl: data.imageUrl || "",
          linkType: data.linkType || "search",
          linkTarget: data.linkTarget || "",
          displayOrder: data.displayOrder || 0,
        };
      })
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .slice(0, 5);
  } catch (err) {
    console.error("getHomePageData: banners query failed", err);
  }

  // Build personalized recommendations if user is authenticated.
  try {
    if (_request.auth) {
      const uid = _request.auth.uid;
      const userDoc = await db.collection(USERS).doc(uid).get();
      const userData = userDoc.exists ? userDoc.data() : {};

      const recentViews = Array.isArray(userData.recentViews) ? userData.recentViews : [];
      const recentSearches = Array.isArray(userData.recentSearches) ? userData.recentSearches : [];

      const categoryWeights = new Map();
      const addCategory = (category, weight) => {
        const key = String(category || "").trim();
        if (!key) return;
        categoryWeights.set(key, (categoryWeights.get(key) || 0) + weight);
      };

      // Views boost
      recentViews.forEach((view) => {
        addCategory(view.category, 3);
      });

      // Purchases boost
      const ordersSnapshot = await db.collection("orders")
        .where("userId", "==", uid)
        .orderBy("orderedAt", "desc")
        .limit(5)
        .get();

      const orderedProductIds = new Set();
      ordersSnapshot.forEach((doc) => {
        const items = doc.data()?.items || [];
        items.forEach((item) => {
          if (item?.productId) {
            orderedProductIds.add(String(item.productId));
          }
        });
      });

      if (orderedProductIds.size > 0) {
        const productDocs = await Promise.all(
          Array.from(orderedProductIds).slice(0, 20).map((id) => db.collection(PRODUCTS).doc(id).get())
        );
        productDocs.forEach((doc) => {
          if (doc.exists) {
            const data = doc.data();
            addCategory(data.category, 5);
          }
        });
      }

      // Searches boost (only if search term matches a category)
      if (categories.length > 0) {
        const categoryLookup = new Map(
          categories.map((c) => [String(c).toLowerCase(), c])
        );
        recentSearches.forEach((search) => {
          const term = normalizeSearchTerm(search.term);
          if (categoryLookup.has(term)) {
            addCategory(categoryLookup.get(term), 2);
          }
        });
      }

      const topCategories = Array.from(categoryWeights.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([category]) => category)
        .slice(0, 5);

      let categoryProducts = [];
      if (topCategories.length > 0) {
        const categorySnapshot = await db.collection(PRODUCTS)
          .where("isActive", "==", true)
          .where("category", "in", topCategories)
          .limit(30)
          .get();
        categoryProducts = categorySnapshot.docs.map(mapProductDoc);
      }

      let popularCandidates = [];
      try {
        const popularSnapshot = await db.collection(PRODUCTS)
          .orderBy("purchaseCount", "desc")
          .limit(20)
          .get();
        popularCandidates = popularSnapshot.docs
          .map(mapProductDoc)
          .filter((p) => p.isActive);
      } catch (err) {
        console.error("getHomePageData: popularity query failed", err);
      }

      const byId = new Map();
      [...categoryProducts, ...popularCandidates].forEach((product) => {
        if (product?.productId) {
          byId.set(String(product.productId), product);
        }
      });

      recommended = Array.from(byId.values())
        .map((product) => {
          const categoryScore = categoryWeights.get(product.category) || 0;
          const popularityScore = product.purchaseCount || 0;
          return {
            ...product,
            _score: (categoryScore * 100) + popularityScore,
          };
        })
        .sort((a, b) => b._score - a._score)
        .slice(0, 5)
        .map(({ _score, ...product }) => product);
    }
  } catch (err) {
    console.error("getHomePageData: recommendation build failed", err);
  }

  if (!recommended || recommended.length === 0) {
    recommended = featured.length > 0 ? featured : popular;
  }

  return {
    categories,
    featured,
    recommended,
    popular,
    banners,
  };
});

// ============================================
// CONTACT FORM
// ============================================

/**
 * Submit a contact form message
 */
exports.submitContactForm = onCall({ region: "asia-south1" }, async (request) => {
  verifyAuth(request.auth);

  const { name, email, message } = request.data;

  if (!name || !email || !message) {
    throw new HttpsError("invalid-argument", "name, email, and message are required.");
  }

  const contactData = {
    name,
    email,
    message,
    userId: request.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection("contactSubmissions").add(contactData);

  return { submissionId: docRef.id, message: "Contact form submitted successfully." };
});
