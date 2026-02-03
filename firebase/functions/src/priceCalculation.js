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

        batch.update(doc.ref, {
          pricing: newPricing,
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

  // Split GST: 3% on gold/diamond/gemstone value, 5% on making/wastage/labour charges
  const jewelryTaxRate = taxSettings.gst?.jewelry || 3;
  const makingTaxRate = taxSettings.gst?.makingCharges || 5;

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
