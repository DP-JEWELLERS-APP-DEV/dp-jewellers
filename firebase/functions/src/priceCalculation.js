const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const db = admin.firestore();

/**
 * Firestore Trigger: When metalRates/current is updated,
 * recalculate prices for ALL active products.
 */
exports.onMetalRatesUpdate = onDocumentUpdated(
  {
    document: "metalRates/current",
    region: "asia-south1",
  },
  async (event) => {
    const newRates = event.data.after.data();
    const previousRates = event.data.before.data();

    console.log("Metal rates updated. Recalculating all product prices...");
    console.log("Previous rates:", JSON.stringify(previousRates));
    console.log("New rates:", JSON.stringify(newRates));

    // Get tax settings and making charges config
    const [taxDoc, makingChargesDoc] = await Promise.all([
      db.collection("taxSettings").doc("current").get(),
      db.collection("makingCharges").doc("current").get(),
    ]);
    const taxSettings = taxDoc.exists ? taxDoc.data() : { gst: { jewelry: 3 } };
    const makingChargesConfig = makingChargesDoc.exists ? makingChargesDoc.data() : {};

    // Get all active products
    const productsSnapshot = await db.collection("products")
      .where("isActive", "==", true)
      .get();

    if (productsSnapshot.empty) {
      console.log("No active products to update.");
      return;
    }

    console.log(`Recalculating prices for ${productsSnapshot.size} products...`);

    // Process in batches of 500 (Firestore batch limit)
    const batchSize = 500;
    const products = productsSnapshot.docs;

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = db.batch();
      const chunk = products.slice(i, i + batchSize);

      for (const doc of chunk) {
        const product = doc.data();
        const newPricing = calculatePrice(product, newRates, taxSettings, makingChargesConfig);

        const updateFields = {
          pricing: newPricing,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Recompute priceRange for configurator-enabled products
        if (product.configurator?.enabled) {
          updateFields.priceRange = computePriceRange(product, newRates, taxSettings, makingChargesConfig);
        }

        batch.update(doc.ref, updateFields);
      }

      await batch.commit();
      console.log(`Updated batch ${Math.floor(i / batchSize) + 1}`);
    }

    console.log(`Successfully recalculated prices for ${products.length} products.`);
  }
);

/**
 * Callable: Calculate price for a single product (preview before saving)
 */
exports.calculateProductPrice = onCall({ region: "asia-south1" }, async (request) => {
  const productData = request.data;

  if (!productData || !productData.metal) {
    throw new HttpsError("invalid-argument", "Product data with metal details is required.");
  }

  const ratesDoc = await db.collection("metalRates").doc("current").get();
  if (!ratesDoc.exists) {
    throw new HttpsError("failed-precondition", "Metal rates not configured.");
  }

  const [taxDoc, makingChargesDoc] = await Promise.all([
    db.collection("taxSettings").doc("current").get(),
    db.collection("makingCharges").doc("current").get(),
  ]);
  const taxSettings = taxDoc.exists ? taxDoc.data() : { gst: { jewelry: 3 } };
  const makingChargesConfig = makingChargesDoc.exists ? makingChargesDoc.data() : {};

  const pricing = calculatePrice(productData, ratesDoc.data(), taxSettings, makingChargesConfig);

  return pricing;
});

/**
 * Callable: Calculate price for a specific variant configuration.
 * Used by the mobile app when a customer changes purity, diamond quality, or size.
 */
exports.calculateVariantPrice = onCall({ region: "asia-south1" }, async (request) => {
  const { productId, selectedPurities, selectedDiamondQuality, selectedSize } = request.data || {};

  if (!productId) {
    throw new HttpsError("invalid-argument", "productId is required.");
  }

  const productDoc = await db.collection("products").doc(productId).get();
  if (!productDoc.exists) {
    throw new HttpsError("not-found", "Product not found.");
  }

  const product = productDoc.data();
  const configurator = product.configurator;

  if (!configurator || !configurator.enabled) {
    // Fallback: return existing stored pricing for non-configurator products
    return product.pricing || {};
  }

  const [ratesDoc, taxDoc, makingChargesDoc] = await Promise.all([
    db.collection("metalRates").doc("current").get(),
    db.collection("taxSettings").doc("current").get(),
    db.collection("makingCharges").doc("current").get(),
  ]);

  if (!ratesDoc.exists) {
    throw new HttpsError("failed-precondition", "Metal rates not configured.");
  }

  const rates = ratesDoc.data();
  const taxSettings = taxDoc.exists ? taxDoc.data() : { gst: { jewelry: 3 } };
  const makingChargesConfig = makingChargesDoc.exists ? makingChargesDoc.data() : {};

  const variantPricing = calculateVariantPriceInternal(
    product, rates, taxSettings, makingChargesConfig,
    selectedPurities || [], selectedDiamondQuality, selectedSize
  );

  return variantPricing;
});

/**
 * Internal variant price calculation.
 * Calculates price for a specific combination of purity, diamond quality, and size.
 */
function calculateVariantPriceInternal(product, rates, taxSettings, makingChargesConfig, selectedPurities, selectedDiamondQuality, selectedSize) {
  const configurator = product.configurator || {};
  const metalOptions = configurator.metalOptions || [];
  const pricing = product.pricing || {};
  const diamond = product.diamond || {};

  // Calculate weight adjustment for selected size
  let weightAdjustment = 0;
  if (selectedSize && configurator.sizeWeights) {
    const sizeEntry = configurator.sizeWeights.find((s) => s.size === selectedSize);
    if (sizeEntry) {
      weightAdjustment = sizeEntry.weightAdjustment || 0;
    }
  }

  // Calculate metal value across all metal options
  let totalMetalValue = 0;
  let totalNetWeight = 0;
  const metalBreakdown = [];

  for (let i = 0; i < metalOptions.length; i++) {
    const metalOpt = metalOptions[i];
    const purity = (selectedPurities && selectedPurities[i]) || metalOpt.defaultPurity;
    const baseWeight = metalOpt.baseNetWeight || 0;
    // Apply size weight adjustment only to the primary (first) metal
    const netWeight = i === 0 ? baseWeight + weightAdjustment : baseWeight;
    let ratePerGram = 0;

    if (metalOpt.type === "gold" && purity && rates.gold) {
      ratePerGram = rates.gold[purity] || 0;
    } else if (metalOpt.type === "silver" && purity && rates.silver) {
      ratePerGram = rates.silver[purity] || 0;
    } else if (metalOpt.type === "platinum" && rates.platinum) {
      ratePerGram = rates.platinum[purity] || rates.platinum.perGram || 0;
    }

    const metalValue = netWeight * ratePerGram;
    totalMetalValue += metalValue;
    totalNetWeight += netWeight;

    metalBreakdown.push({
      type: metalOpt.type,
      purity,
      netWeight: Math.round(netWeight * 1000) / 1000,
      ratePerGram,
      value: Math.round(metalValue),
    });
  }

  // Calculate diamond value using selected quality bucket
  let diamondValue = 0;
  let diamondRatePerCarat = 0;
  const totalCaratWeight = diamond.totalCaratWeight || 0;

  if (diamond.hasDiamond && totalCaratWeight > 0 && rates.diamond) {
    const qualityBucket = selectedDiamondQuality || configurator.diamondOptions?.defaultQuality || "SI_IJ";
    diamondRatePerCarat = rates.diamond[qualityBucket] || rates.diamond["SI_IJ"] || 25000;
    diamondValue = totalCaratWeight * diamondRatePerCarat;
  }

  // Gemstone value
  const gemstoneValue = pricing.gemstoneValue || 0;

  // Making charges
  const { mcType, mcValue } = resolveMakingCharge(product, makingChargesConfig);
  let makingChargeAmount = 0;
  if (mcType === "percentage") {
    makingChargeAmount = totalMetalValue * (mcValue / 100);
  } else if (mcType === "flat_per_gram") {
    makingChargeAmount = totalNetWeight * mcValue;
  } else if (mcType === "fixed_amount") {
    makingChargeAmount = mcValue;
  }

  // Wastage charges
  const { wcType, wcValue } = resolveWastageCharge(product, makingChargesConfig);
  let wastageChargeAmount = 0;
  if (wcType === "percentage") {
    wastageChargeAmount = totalMetalValue * (wcValue / 100);
  } else {
    wastageChargeAmount = wcValue;
  }

  const stoneSettingCharges = pricing.stoneSettingCharges || 0;
  const designCharges = pricing.designCharges || 0;

  const subtotal = totalMetalValue + diamondValue + gemstoneValue +
    makingChargeAmount + wastageChargeAmount + stoneSettingCharges + designCharges;

  const discount = pricing.discount || 0;

  const productTax = product.tax || {};
  const jewelryTaxRate = productTax.jewelryGst || taxSettings.gst?.jewelry || 3;
  const makingTaxRate = productTax.makingGst || taxSettings.gst?.makingCharges || 5;

  const jewelryTaxableAmount = totalMetalValue + diamondValue + gemstoneValue;
  const labourTaxableAmount = makingChargeAmount + wastageChargeAmount + stoneSettingCharges + designCharges;

  const jewelryTaxAmount = jewelryTaxableAmount * (jewelryTaxRate / 100);
  const labourTaxAmount = labourTaxableAmount * (makingTaxRate / 100);
  const totalTaxAmount = jewelryTaxAmount + labourTaxAmount;

  const finalPrice = Math.round(subtotal - discount + totalTaxAmount);

  return {
    metalBreakdown,
    metalValue: Math.round(totalMetalValue),
    totalNetWeight: Math.round(totalNetWeight * 1000) / 1000,
    diamondRatePerCarat,
    diamondQuality: selectedDiamondQuality || configurator.diamondOptions?.defaultQuality || null,
    diamondValue: Math.round(diamondValue),
    gemstoneValue,
    makingChargeType: mcType,
    makingChargeValue: mcValue,
    makingChargeAmount: Math.round(makingChargeAmount),
    wastageChargeType: wcType,
    wastageChargeValue: wcValue,
    wastageChargeAmount: Math.round(wastageChargeAmount),
    stoneSettingCharges,
    designCharges,
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

/**
 * Compute min/max/default price range for a configurator-enabled product.
 * Iterates all purity + diamond quality combos (at default size) to find extremes.
 */
function computePriceRange(product, rates, taxSettings, makingChargesConfig) {
  const configurator = product.configurator;
  if (!configurator || !configurator.enabled) {
    const fp = product.pricing?.finalPrice || 0;
    return { minPrice: fp, maxPrice: fp, defaultPrice: fp };
  }

  const metalOptions = configurator.metalOptions || [];
  if (metalOptions.length === 0) {
    const fp = product.pricing?.finalPrice || 0;
    return { minPrice: fp, maxPrice: fp, defaultPrice: fp };
  }

  // Collect all purity combinations for the first metal (primary driver of price variation)
  const primaryMetal = metalOptions[0];
  const purities = primaryMetal.availablePurities || [primaryMetal.defaultPurity];
  const diamondQualities = configurator.diamondOptions?.availableQualities || [];
  const hasDiamond = product.diamond?.hasDiamond && diamondQualities.length > 0;

  // Also consider size extremes for weight adjustment
  const sizeWeights = configurator.sizeWeights || [];
  const weightAdjustments = sizeWeights.length > 0
    ? sizeWeights.map((s) => s.weightAdjustment || 0)
    : [0];
  const minWeightAdj = Math.min(...weightAdjustments);
  const maxWeightAdj = Math.max(...weightAdjustments);

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  let defaultPrice = 0;

  const diamondOptions = hasDiamond ? diamondQualities : [null];

  for (const purity of purities) {
    for (const dq of diamondOptions) {
      // Check both min and max weight adjustments
      for (const wAdj of [minWeightAdj, maxWeightAdj]) {
        const selectedPurities = [purity];
        // Temporarily set sizeWeights to simulate this weight adjustment
        const tempProduct = {
          ...product,
          configurator: {
            ...configurator,
            sizeWeights: [{ size: "__temp", weightAdjustment: wAdj }],
          },
        };
        const result = calculateVariantPriceInternal(
          tempProduct, rates, taxSettings, makingChargesConfig,
          selectedPurities, dq, "__temp"
        );

        if (result.finalPrice < minPrice) minPrice = result.finalPrice;
        if (result.finalPrice > maxPrice) maxPrice = result.finalPrice;
      }

      // Calculate default price
      const isDefaultPurity = purity === primaryMetal.defaultPurity;
      const isDefaultDiamond = !hasDiamond || dq === configurator.diamondOptions?.defaultQuality;
      if (isDefaultPurity && isDefaultDiamond) {
        const defaultResult = calculateVariantPriceInternal(
          product, rates, taxSettings, makingChargesConfig,
          [purity], dq, configurator.defaultSize || null
        );
        defaultPrice = defaultResult.finalPrice;
      }
    }
  }

  if (minPrice === Infinity) minPrice = 0;
  if (maxPrice === -Infinity) maxPrice = 0;

  return {
    minPrice,
    maxPrice,
    defaultPrice: defaultPrice || minPrice,
  };
}

// Export internal helpers for use by other modules (cart enrichment)
exports._calculateVariantPriceInternal = calculateVariantPriceInternal;
exports._computePriceRange = computePriceRange;

/**
 * Resolve making/wastage charge for a product.
 * Priority: product-level override > category override > global default
 */
function resolveMakingCharge(product, makingChargesConfig) {
  const pricing = product.pricing || {};
  const category = product.category || "";

  // 1. If product has its own making charge set, use it
  if (pricing.makingChargeValue && pricing.makingChargeValue > 0) {
    return {
      mcType: pricing.makingChargeType || "percentage",
      mcValue: pricing.makingChargeValue,
    };
  }

  // 2. Look for category-specific override in makingCharges collection
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

  // 3. Fall back to global default
  const globalDefault = makingChargesConfig.globalDefault || {};
  return {
    mcType: globalDefault.chargeType || "percentage",
    mcValue: globalDefault.value || 0,
  };
}

function resolveWastageCharge(product, makingChargesConfig) {
  const pricing = product.pricing || {};

  // 1. If product has its own wastage charge set, use it
  if (pricing.wastageChargeValue && pricing.wastageChargeValue > 0) {
    return {
      wcType: pricing.wastageChargeType || "percentage",
      wcValue: pricing.wastageChargeValue,
    };
  }

  // 2. Fall back to global wastage default
  const globalWastage = makingChargesConfig.globalWastage || {};
  return {
    wcType: globalWastage.chargeType || "percentage",
    wcValue: globalWastage.value || 0,
  };
}

/**
 * Core price calculation logic
 */
function calculatePrice(product, rates, taxSettings, makingChargesConfig = {}) {
  const metal = product.metal || {};
  const diamond = product.diamond || {};
  const pricing = product.pricing || {};

  // Metal value
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

  // Diamond value
  let diamondValue = 0;
  let diamondRatePerCarat = 0;

  if (diamond.hasDiamond && diamond.totalCaratWeight && rates.diamond) {
    const clarityMap = {
      FL: "IF", IF: "IF",
      VVS1: "VVS", VVS2: "VVS",
      VS1: "VS", VS2: "VS",
      SI1: "SI", SI2: "SI",
      I1: "SI", I2: "SI", I3: "SI",
    };
    const colorMap = {
      D: "DEF", E: "DEF", F: "DEF",
      G: "GH", H: "GH",
      I: "IJ", J: "IJ",
      K: "IJ", L: "IJ", M: "IJ",
    };

    const clarityKey = clarityMap[diamond.clarity] || "SI";
    const colorKey = colorMap[diamond.color] || "IJ";
    const rateKey = `${clarityKey}_${colorKey}`;

    diamondRatePerCarat = rates.diamond[rateKey] || rates.diamond["SI_IJ"] || 25000;
    diamondValue = diamond.totalCaratWeight * diamondRatePerCarat;
  }

  // Gemstone value (manually set)
  const gemstoneValue = pricing.gemstoneValue || 0;

  // Making charges: category override → global default
  const { mcType, mcValue } = resolveMakingCharge(product, makingChargesConfig);
  let makingChargeAmount = 0;

  if (mcType === "percentage") {
    makingChargeAmount = metalValue * (mcValue / 100);
  } else if (mcType === "flat_per_gram") {
    makingChargeAmount = (metal.netWeight || 0) * mcValue;
  } else if (mcType === "fixed_amount") {
    makingChargeAmount = mcValue;
  }

  // Wastage charges: product override → global default
  const { wcType, wcValue } = resolveWastageCharge(product, makingChargesConfig);
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
  const productTax = product.tax || {};
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
