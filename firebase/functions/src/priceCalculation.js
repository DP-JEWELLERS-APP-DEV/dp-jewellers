const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const db = admin.firestore();

/**
 * Helper: get default pricing for a product using its configurator defaults.
 */
function getDefaultPricing(product, rates, taxSettings, makingChargesConfig) {
  const normalized = normalizeConfigurator(product.configurator);
  if (!normalized) return null;

  const defaultMetal = normalized.configurableMetals.find((m) => m.type === normalized.defaultMetalType)
    || normalized.configurableMetals[0];
  const defaultVariant = defaultMetal?.variants?.find((v) => v.purity === normalized.defaultPurity)
    || defaultMetal?.variants?.[0];

  if (!defaultVariant) return null;

  return calculateVariantPriceInternal(
    product, rates, taxSettings, makingChargesConfig,
    defaultVariant.purity, defaultVariant.defaultDiamondQuality || null,
    defaultVariant.defaultSize || null, defaultMetal.type
  );
}

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
        const newPricing = getDefaultPricing(product, newRates, taxSettings, makingChargesConfig);

        if (!newPricing) continue; // Skip products without valid configurator

        const priceRange = computePriceRange(product, newRates, taxSettings, makingChargesConfig);

        batch.update(doc.ref, {
          pricing: newPricing,
          priceRange,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
      console.log(`Updated batch ${Math.floor(i / batchSize) + 1}`);
    }

    console.log(`Successfully recalculated prices for ${products.length} products.`);
  }
);

/**
 * Callable: Calculate price for a product (preview before saving).
 * Uses configurator data to compute default variant price.
 */
exports.calculateProductPrice = onCall({ region: "asia-south1" }, async (request) => {
  const productData = request.data;

  if (!productData || !productData.configurator) {
    throw new HttpsError("invalid-argument", "Product data with configurator details is required.");
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

  const pricing = getDefaultPricing(productData, ratesDoc.data(), taxSettings, makingChargesConfig);

  if (!pricing) {
    throw new HttpsError("invalid-argument", "Could not compute pricing. Check configurator data.");
  }

  return pricing;
});

/**
 * Callable: Calculate price for a specific variant configuration.
 * Used by the mobile app when a customer changes purity, diamond quality, or size.
 */
exports.calculateVariantPrice = onCall({ region: "asia-south1" }, async (request) => {
  const { productId, selectedPurity, selectedDiamondQuality, selectedSize, selectedMetalType } = request.data || {};

  if (!productId) {
    throw new HttpsError("invalid-argument", "productId is required.");
  }

  const productDoc = await db.collection("products").doc(productId).get();
  if (!productDoc.exists) {
    throw new HttpsError("not-found", "Product not found.");
  }

  const product = productDoc.data();

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
    selectedPurity, selectedDiamondQuality, selectedSize, selectedMetalType
  );

  return variantPricing;
});

/**
 * Normalize configurator data to v3 (multi-metal) format.
 * Handles v2 (configurableMetal singular) and v3 (configurableMetals array).
 */
function normalizeConfigurator(configurator) {
  if (!configurator || !configurator.enabled) return null;

  // v3: already has configurableMetals array
  if (configurator.configurableMetals && configurator.configurableMetals.length > 0) {
    return {
      configurableMetals: configurator.configurableMetals,
      defaultMetalType: configurator.defaultMetalType || configurator.configurableMetals[0].type,
      defaultPurity: configurator.defaultPurity || configurator.configurableMetals[0].defaultPurity || configurator.configurableMetals[0].variants?.[0]?.purity,
      fixedMetals: configurator.fixedMetals || [],
    };
  }

  // v2: single configurableMetal object — wrap into array
  if (configurator.configurableMetal) {
    const cm = configurator.configurableMetal;
    return {
      configurableMetals: [cm],
      defaultMetalType: cm.type,
      defaultPurity: cm.defaultPurity || cm.variants?.[0]?.purity,
      fixedMetals: configurator.fixedMetals || [],
    };
  }

  return null;
}

/**
 * Get metal rate per gram for a given type and purity.
 */
function getMetalRate(type, purity, rates) {
  if (type === "gold" && purity && rates.gold) return rates.gold[purity] || 0;
  if (type === "silver" && purity && rates.silver) return rates.silver[purity] || 0;
  if (type === "platinum" && rates.platinum) return rates.platinum[purity] || rates.platinum.perGram || 0;
  return 0;
}

/**
 * Internal variant price calculation (v3 - multi-metal).
 * Calculates price for a specific metal type, purity, diamond quality, and size combination.
 */
function calculateVariantPriceInternal(product, rates, taxSettings, makingChargesConfig, selectedPurity, selectedDiamondQuality, selectedSize, selectedMetalType) {
  const configurator = product.configurator || {};
  const normalized = normalizeConfigurator(configurator);
  const fixedMetals = normalized ? normalized.fixedMetals : (configurator.fixedMetals || []);
  const pricing = product.pricing || {};
  const diamond = product.diamond || {};

  // Find the matching metal entry and variant
  let configMetal;
  let variant;

  if (normalized) {
    const metals = normalized.configurableMetals;
    // Find metal entry by selectedMetalType, fallback to defaultMetalType, then first
    configMetal = (selectedMetalType && metals.find((m) => m.type === selectedMetalType))
      || metals.find((m) => m.type === normalized.defaultMetalType)
      || metals[0];

    const variants = configMetal?.variants || [];
    variant = variants.find((v) => v.purity === selectedPurity)
      || variants.find((v) => v.purity === configMetal.defaultPurity)
      || variants[0];
  }

  if (!variant) {
    // Fallback: return stored pricing if no variants defined
    return pricing;
  }

  // Determine weight for the configurable metal from size or base weight
  let configurableNetWeight = variant.netWeight || 0;
  if (selectedSize && variant.sizes && variant.sizes.length > 0) {
    const sizeEntry = variant.sizes.find((s) => s.size === selectedSize);
    if (sizeEntry) {
      configurableNetWeight = sizeEntry.netWeight || configurableNetWeight;
    }
  }

  // Calculate configurable metal value
  let totalMetalValue = 0;
  let totalNetWeight = 0;
  const metalBreakdown = [];

  const cfgRate = getMetalRate(configMetal.type, variant.purity, rates);
  const cfgMetalValue = configurableNetWeight * cfgRate;
  totalMetalValue += cfgMetalValue;
  totalNetWeight += configurableNetWeight;
  metalBreakdown.push({
    type: configMetal.type,
    purity: variant.purity,
    netWeight: Math.round(configurableNetWeight * 1000) / 1000,
    ratePerGram: cfgRate,
    value: Math.round(cfgMetalValue),
  });

  // Add fixed metals
  for (const fm of fixedMetals) {
    const fmRate = getMetalRate(fm.type, fm.purity, rates);
    const sizeRow = selectedSize && fm.sizes?.length > 0
      ? fm.sizes.find((s) => s.size === selectedSize)
      : null;
    const fmNetWeight = Number(sizeRow?.netWeight ?? fm.netWeight) || 0;
    const fmValue = fmNetWeight * fmRate;
    totalMetalValue += fmValue;
    totalNetWeight += fmNetWeight;
    metalBreakdown.push({
      type: fm.type,
      purity: fm.purity,
      netWeight: Math.round(fmNetWeight * 1000) / 1000,
      ratePerGram: fmRate,
      value: Math.round(fmValue),
    });
  }

  // Calculate diamond value using selected quality bucket
  let diamondValue = 0;
  let diamondRatePerCarat = 0;
  const totalCaratWeight = diamond.totalCaratWeight || 0;

  if (diamond.hasDiamond && totalCaratWeight > 0 && rates.diamond) {
    const qualityBucket = selectedDiamondQuality || variant.defaultDiamondQuality || "SI_IJ";
    diamondRatePerCarat = rates.diamond[qualityBucket] || rates.diamond["SI_IJ"] || 25000;
    diamondValue = totalCaratWeight * diamondRatePerCarat;
  }

  // Gemstone value
  const gemstoneValue = pricing.gemstoneValue || 0;

  // Per-metal pricing takes priority over category/global defaults
  const metalPricing = configMetal?.pricing || {};

  // Making charges: per-metal > category > global
  let mcType, mcValue;
  if (metalPricing.makingChargeValue != null && metalPricing.makingChargeValue !== "" && metalPricing.makingChargeValue !== 0) {
    mcType = metalPricing.makingChargeType || "percentage";
    mcValue = metalPricing.makingChargeValue;
  } else {
    ({ mcType, mcValue } = resolveMakingCharge(product, makingChargesConfig));
  }
  let makingChargeAmount = 0;
  if (mcType === "percentage") {
    makingChargeAmount = totalMetalValue * (mcValue / 100);
  } else if (mcType === "flat_per_gram") {
    makingChargeAmount = totalNetWeight * mcValue;
  } else if (mcType === "fixed_amount") {
    makingChargeAmount = mcValue;
  }

  // Wastage charges: per-metal > global
  let wcType, wcValue;
  if (metalPricing.wastageChargeValue != null && metalPricing.wastageChargeValue !== "" && metalPricing.wastageChargeValue !== 0) {
    wcType = metalPricing.wastageChargeType || "percentage";
    wcValue = metalPricing.wastageChargeValue;
  } else {
    ({ wcType, wcValue } = resolveWastageCharge(product, makingChargesConfig));
  }
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

  // Tax: per-metal > product-level > global
  const productTax = product.tax || {};
  const jewelryTaxRate = metalPricing.jewelryGst || productTax.jewelryGst || taxSettings.gst?.jewelry || 3;
  const makingTaxRate = metalPricing.makingGst || productTax.makingGst || taxSettings.gst?.makingCharges || 5;

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
    diamondQuality: selectedDiamondQuality || variant?.defaultDiamondQuality || null,
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
 * Compute min/max/default price range for a product.
 * Iterates all metal types x purity variants x diamond qualities x size weight extremes.
 */
function computePriceRange(product, rates, taxSettings, makingChargesConfig) {
  const normalized = normalizeConfigurator(product.configurator);
  if (!normalized || normalized.configurableMetals.length === 0) {
    return { minPrice: 0, maxPrice: 0, defaultPrice: 0 };
  }

  const allMetals = normalized.configurableMetals;
  const totalVariants = allMetals.reduce((sum, m) => sum + (m.variants || []).length, 0);
  if (totalVariants === 0) {
    return { minPrice: 0, maxPrice: 0, defaultPrice: 0 };
  }

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  let defaultPrice = 0;

  for (const metalEntry of allMetals) {
    const variants = metalEntry.variants || [];

    for (const variant of variants) {
      const diamondQualities = (variant.availableDiamondQualities || []).length > 0
        ? variant.availableDiamondQualities
        : [null];

      // Determine size extremes for this variant
      const sizes = variant.sizes || [];
      let sizeOptions;
      if (sizes.length > 0) {
        const weights = sizes.map((s) => s.netWeight || 0);
        const minWeight = Math.min(...weights);
        const maxWeight = Math.max(...weights);
        const minSizeEntry = sizes.find((s) => (s.netWeight || 0) === minWeight);
        const maxSizeEntry = sizes.find((s) => (s.netWeight || 0) === maxWeight);
        sizeOptions = [minSizeEntry.size, maxSizeEntry.size];
        if (sizeOptions[0] === sizeOptions[1]) sizeOptions = [sizeOptions[0]];
      } else {
        sizeOptions = [null];
      }

      for (const dq of diamondQualities) {
        for (const sz of sizeOptions) {
          const result = calculateVariantPriceInternal(
            product, rates, taxSettings, makingChargesConfig,
            variant.purity, dq, sz, metalEntry.type
          );
          if (result.finalPrice < minPrice) minPrice = result.finalPrice;
          if (result.finalPrice > maxPrice) maxPrice = result.finalPrice;
        }
      }

      // Calculate default price for the default metal + default purity
      if (metalEntry.type === normalized.defaultMetalType && variant.purity === normalized.defaultPurity) {
        const defaultDQ = variant.defaultDiamondQuality || null;
        const defaultSz = variant.defaultSize || null;
        const defaultResult = calculateVariantPriceInternal(
          product, rates, taxSettings, makingChargesConfig,
          variant.purity, defaultDQ, defaultSz, metalEntry.type
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

// Export internal helpers for use by other modules (cart, orders, products)
exports._calculateVariantPriceInternal = calculateVariantPriceInternal;
exports._computePriceRange = computePriceRange;
exports._normalizeConfigurator = normalizeConfigurator;
exports._getDefaultPricing = getDefaultPricing;

/**
 * Resolve making charge fallback: category override > global default.
 * Used when per-metal pricing is not set.
 */
function resolveMakingCharge(product, makingChargesConfig) {
  const category = product.category || "";

  // 1. Look for category-specific override in makingCharges collection
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

  // 2. Fall back to global default
  const globalDefault = makingChargesConfig.globalDefault || {};
  return {
    mcType: globalDefault.chargeType || "percentage",
    mcValue: globalDefault.value || 0,
  };
}

function resolveWastageCharge(product, makingChargesConfig) {
  // Fall back to global wastage default
  const globalWastage = makingChargesConfig.globalWastage || {};
  return {
    wcType: globalWastage.chargeType || "percentage",
    wcValue: globalWastage.value || 0,
  };
}
