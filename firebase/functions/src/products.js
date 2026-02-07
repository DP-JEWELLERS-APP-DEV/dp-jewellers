const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { _computePriceRange } = require("./priceCalculation");

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
  await verifyProductAdmin(request.auth);

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

  // Calculate initial price
  const pricing = await calculatePricing(data);

  const product = {
    productCode: data.productCode,
    name: data.name,
    description: data.description || "",
    category: data.category,
    subCategory: data.subCategory || "",
    images: data.images || [],
    metal: data.metal || {},
    metals: data.metals || [],
    diamond: data.diamond || { hasDiamond: false },
    gemstones: data.gemstones || [],
    dimensions: data.dimensions || {},
    goldOptions: data.goldOptions || [],
    sizes: data.sizes || [],
    tax: data.tax || {},
    pricing: pricing,
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

  // Store configurator if provided
  if (data.configurator) {
    product.configurator = data.configurator;
  }

  // Compute priceRange for configurator-enabled products
  if (data.configurator?.enabled) {
    const [ratesDoc, taxDoc, makingChargesDoc] = await Promise.all([
      db.collection("metalRates").doc("current").get(),
      db.collection("taxSettings").doc("current").get(),
      db.collection("makingCharges").doc("current").get(),
    ]);
    const rates = ratesDoc.exists ? ratesDoc.data() : {};
    const taxSettings = taxDoc.exists ? taxDoc.data() : { gst: { jewelry: 3 } };
    const makingChargesConfig = makingChargesDoc.exists ? makingChargesDoc.data() : {};
    product.priceRange = _computePriceRange(product, rates, taxSettings, makingChargesConfig);
  }

  const docRef = await db.collection(PRODUCTS).add(product);

  return { productId: docRef.id, message: "Product created successfully." };
});

/**
 * Update an existing product
 */
exports.updateProduct = onCall({ region: "asia-south1" }, async (request) => {
  await verifyProductAdmin(request.auth);

  const { productId, ...updateData } = request.data;

  if (!productId) {
    throw new HttpsError("invalid-argument", "productId is required.");
  }

  const productRef = db.collection(PRODUCTS).doc(productId);
  const productDoc = await productRef.get();

  if (!productDoc.exists) {
    throw new HttpsError("not-found", "Product not found.");
  }

  // If metal/diamond/pricing fields changed, recalculate price
  const existingData = productDoc.data();
  const mergedData = { ...existingData, ...updateData };

  if (updateData.metal || updateData.diamond || updateData.pricing || updateData.tax) {
    updateData.pricing = await calculatePricing(mergedData);
  }

  // Sync isActive with status if status changed
  if (updateData.status) {
    updateData.isActive = updateData.status === "active" || updateData.status === "coming_soon";
  }

  // Recompute priceRange if configurator or pricing-related fields changed
  const finalConfigurator = updateData.configurator || existingData.configurator;
  if (finalConfigurator?.enabled) {
    const mergedForRange = { ...existingData, ...updateData, configurator: finalConfigurator };
    const [ratesDoc, taxDoc, makingChargesDoc] = await Promise.all([
      db.collection("metalRates").doc("current").get(),
      db.collection("taxSettings").doc("current").get(),
      db.collection("makingCharges").doc("current").get(),
    ]);
    const rates = ratesDoc.exists ? ratesDoc.data() : {};
    const taxSettings = taxDoc.exists ? taxDoc.data() : { gst: { jewelry: 3 } };
    const makingChargesConfig = makingChargesDoc.exists ? makingChargesDoc.data() : {};
    updateData.priceRange = _computePriceRange(mergedForRange, rates, taxSettings, makingChargesConfig);
  }

  updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  await productRef.update(updateData);

  return { productId, message: "Product updated successfully." };
});

/**
 * Archive a product (soft delete)
 */
exports.deleteProduct = onCall({ region: "asia-south1" }, async (request) => {
  await verifyProductAdmin(request.auth);

  const { productId } = request.data;
  if (!productId) {
    throw new HttpsError("invalid-argument", "productId is required.");
  }

  const productRef = db.collection(PRODUCTS).doc(productId);
  const productDoc = await productRef.get();

  if (!productDoc.exists) {
    throw new HttpsError("not-found", "Product not found.");
  }

  await productRef.update({
    status: "archived",
    isActive: false,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { productId, message: "Product archived successfully." };
});

/**
 * Restore an archived product
 */
exports.restoreProduct = onCall({ region: "asia-south1" }, async (request) => {
  await verifyProductAdmin(request.auth);

  const { productId } = request.data;
  if (!productId) {
    throw new HttpsError("invalid-argument", "productId is required.");
  }

  const productRef = db.collection(PRODUCTS).doc(productId);
  const productDoc = await productRef.get();

  if (!productDoc.exists) {
    throw new HttpsError("not-found", "Product not found.");
  }

  await productRef.update({
    status: "active",
    isActive: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

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

  // If includeAll is true and caller is admin, show all products including archived
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
  if (metalType) query = query.where("metal.type", "==", metalType);
  if (featured) query = query.where("featured", "==", true);
  if (bestseller) query = query.where("bestseller", "==", true);
  if (newArrival) query = query.where("newArrival", "==", true);
  if (collection) query = query.where("collections", "array-contains", collection);
  if (tag) query = query.where("tags", "array-contains", tag);

  // Sort
  const validSortFields = ["createdAt", "pricing.finalPrice", "displayOrder", "purchaseCount"];
  const field = validSortFields.includes(sortBy) ? sortBy : "createdAt";
  query = query.orderBy(field, sortOrder === "asc" ? "asc" : "desc");

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

  // Client-side price filtering (Firestore doesn't support range on calculated fields easily)
  let filtered = products;
  if (minPrice) {
    filtered = filtered.filter((p) => (p.pricing?.finalPrice || 0) >= minPrice);
  }
  if (maxPrice) {
    filtered = filtered.filter((p) => (p.pricing?.finalPrice || 0) <= maxPrice);
  }

  return {
    products: filtered,
    count: filtered.length,
    lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null,
  };
});

/**
 * Resolve making/wastage charge for a product.
 * Priority: product-level override > category override > global default
 */
function resolveMakingCharge(product, makingChargesConfig) {
  const pricing = product.pricing || {};
  const category = product.category || "";

  // 1. Product-level override
  if (pricing.makingChargeValue && pricing.makingChargeValue > 0) {
    return {
      mcType: pricing.makingChargeType || "percentage",
      mcValue: pricing.makingChargeValue,
    };
  }

  // 2. Category-specific override
  const charges = makingChargesConfig.charges || [];
  const categoryOverride = charges.find(
    (c) => c.jewelryType && c.jewelryType.toLowerCase() === category.toLowerCase()
  );

  if (categoryOverride) {
    return {
      mcType: categoryOverride.chargeType || "percentage",
      mcValue: categoryOverride.value || 0,
    };
  }

  // 3. Global default
  const globalDefault = makingChargesConfig.globalDefault || {};
  return {
    mcType: globalDefault.chargeType || "percentage",
    mcValue: globalDefault.value || 0,
  };
}

function resolveWastageCharge(product, makingChargesConfig) {
  const pricing = product.pricing || {};

  // 1. Product-level override
  if (pricing.wastageChargeValue && pricing.wastageChargeValue > 0) {
    return {
      wcType: pricing.wastageChargeType || "percentage",
      wcValue: pricing.wastageChargeValue,
    };
  }

  // 2. Global wastage default
  const globalWastage = makingChargesConfig.globalWastage || {};
  return {
    wcType: globalWastage.chargeType || "percentage",
    wcValue: globalWastage.value || 0,
  };
}

/**
 * Calculate pricing based on current metal rates and making charges config
 */
async function calculatePricing(productData) {
  const [ratesDoc, taxDoc, makingChargesDoc] = await Promise.all([
    db.collection("metalRates").doc("current").get(),
    db.collection("taxSettings").doc("current").get(),
    db.collection("makingCharges").doc("current").get(),
  ]);

  const rates = ratesDoc.exists ? ratesDoc.data() : {};
  const taxSettings = taxDoc.exists ? taxDoc.data() : { gst: { jewelry: 3 } };
  const makingChargesConfig = makingChargesDoc.exists ? makingChargesDoc.data() : {};

  const metal = productData.metal || {};
  const diamond = productData.diamond || {};
  const pricing = productData.pricing || {};

  // Calculate metal value
  let metalValue = 0;
  let ratePerGram = 0;

  if (metal.type === "gold" && metal.purity && rates.gold) {
    ratePerGram = rates.gold[metal.purity] || 0;
    metalValue = (metal.netWeight || 0) * ratePerGram;
  } else if (metal.type === "silver" && metal.silverType && rates.silver) {
    ratePerGram = rates.silver[metal.silverType] || 0;
    metalValue = (metal.netWeight || 0) * ratePerGram;
  } else if (metal.type === "platinum" && rates.platinum) {
    ratePerGram = rates.platinum.perGram || 0;
    metalValue = (metal.netWeight || 0) * ratePerGram;
  }

  // Calculate diamond value
  let diamondValue = 0;
  let diamondRatePerCarat = 0;

  if (diamond.hasDiamond && rates.diamond) {
    const clarityMap = { FL: "IF", IF: "IF", VVS1: "VVS", VVS2: "VVS", VS1: "VS", VS2: "VS", SI1: "SI", SI2: "SI" };
    const colorMap = { D: "DEF", E: "DEF", F: "DEF", G: "GH", H: "GH", I: "IJ", J: "IJ" };

    if (diamond.variants && diamond.variants.length > 0) {
      // Per-variant calculation: each variant has its own clarity/color/rate
      for (const variant of diamond.variants) {
        const vClarity = clarityMap[variant.clarity] || clarityMap[diamond.clarity] || "SI";
        const vColor = colorMap[variant.color] || colorMap[diamond.color] || "IJ";
        const vRateKey = `${vClarity}_${vColor}`;
        const vRate = rates.diamond[vRateKey] || rates.diamond["SI_IJ"] || 25000;
        diamondValue += (variant.caratWeight || 0) * vRate;
      }
      // Use the first variant's rate as the representative rate
      const firstClarity = clarityMap[diamond.variants[0].clarity] || "SI";
      const firstColor = colorMap[diamond.variants[0].color] || "IJ";
      diamondRatePerCarat = rates.diamond[`${firstClarity}_${firstColor}`] || rates.diamond["SI_IJ"] || 25000;
    } else {
      // Legacy: single clarity/color at diamond level
      const clarityKey = clarityMap[diamond.clarity] || "SI";
      const colorKey = colorMap[diamond.color] || "IJ";
      const rateKey = `${clarityKey}_${colorKey}`;
      diamondRatePerCarat = rates.diamond[rateKey] || rates.diamond["SI_IJ"] || 25000;
      const totalCaratWeight = diamond.totalCaratWeight || 0;
      diamondValue = totalCaratWeight * diamondRatePerCarat;
    }
  }

  // Calculate gemstone value
  let gemstoneValue = 0;
  if (productData.gemstones && productData.gemstones.length > 0) {
    gemstoneValue = pricing.gemstoneValue || 0;
  }

  // Making charges: product > category override > global default
  const { mcType, mcValue } = resolveMakingCharge(productData, makingChargesConfig);
  let makingChargeAmount = 0;

  if (mcType === "percentage") {
    makingChargeAmount = metalValue * (mcValue / 100);
  } else if (mcType === "flat_per_gram") {
    makingChargeAmount = (metal.netWeight || 0) * mcValue;
  } else if (mcType === "fixed_amount") {
    makingChargeAmount = mcValue;
  }

  // Wastage charges: product > global default
  const { wcType, wcValue } = resolveWastageCharge(productData, makingChargesConfig);
  let wastageChargeAmount = 0;

  if (wcType === "percentage") {
    wastageChargeAmount = metalValue * (wcValue / 100);
  } else {
    wastageChargeAmount = wcValue;
  }

  const stoneSettingCharges = pricing.stoneSettingCharges || 0;
  const designCharges = pricing.designCharges || 0;

  const subtotal = metalValue + diamondValue + gemstoneValue +
    makingChargeAmount + wastageChargeAmount + stoneSettingCharges + designCharges;

  const discount = pricing.discount || 0;

  // Use product-level tax if set, otherwise fall back to global tax settings
  const productTax = productData.tax || {};
  const jewelryTaxRate = productTax.jewelryGst || taxSettings.gst?.jewelry || 3;
  const makingTaxRate = productTax.makingGst || taxSettings.gst?.makingCharges || 5;

  const jewelryTaxableAmount = metalValue + diamondValue + gemstoneValue;
  const labourTaxableAmount = makingChargeAmount + wastageChargeAmount + stoneSettingCharges + designCharges;

  const jewelryTaxAmount = jewelryTaxableAmount * (jewelryTaxRate / 100);
  const labourTaxAmount = labourTaxableAmount * (makingTaxRate / 100);
  const totalTaxAmount = jewelryTaxAmount + labourTaxAmount;
  const finalPrice = Math.round(subtotal - discount + totalTaxAmount);

  return {
    goldRatePerGram: metal.type === "gold" ? ratePerGram : 0,
    silverRatePerGram: metal.type === "silver" ? ratePerGram : 0,
    diamondRatePerCarat,
    makingChargeType: mcType,
    makingChargeValue: mcValue,
    makingChargeAmount: Math.round(makingChargeAmount),
    wastageChargeType: wcType,
    wastageChargeValue: wcValue,
    wastageChargeAmount: Math.round(wastageChargeAmount),
    stoneSettingCharges,
    designCharges,
    metalValue: Math.round(metalValue),
    diamondValue: Math.round(diamondValue),
    gemstoneValue,
    subtotal: Math.round(subtotal),
    discount,
    jewelryTaxRate,
    makingTaxRate,
    jewelryTaxAmount: Math.round(jewelryTaxAmount),
    labourTaxAmount: Math.round(labourTaxAmount),
    taxAmount: Math.round(totalTaxAmount),
    finalPrice,
    mrp: pricing.mrp || finalPrice,
    sellingPrice: finalPrice,
  };
}
