const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { requiresApproval } = require("./approvalUtils");
const { logActivity } = require("./activityLog");

const db = admin.firestore();

// Verify the caller is an admin with rates permission
async function verifyRatesAdmin(auth) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const adminDoc = await db.collection("admins").doc(auth.uid).get();
  if (!adminDoc.exists || !adminDoc.data().isActive) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  const data = adminDoc.data();
  if (data.role !== "super_admin" && !data.permissions?.manageRates) {
    throw new HttpsError("permission-denied", "Rate management permission required.");
  }
  return data;
}

/**
 * Update metal rates (gold, silver, diamond, platinum)
 * Also saves previous rates to priceHistory collection
 */
exports.updateMetalRates = onCall({ region: "asia-south1" }, async (request) => {
  const adminData = await verifyRatesAdmin(request.auth);

  const { gold, silver, diamond, platinum } = request.data;

  if (!gold && !silver && !diamond && !platinum) {
    throw new HttpsError("invalid-argument", "At least one rate category must be provided.");
  }

  const ratesRef = db.collection("metalRates").doc("current");
  const currentRates = await ratesRef.get();

  // Save current rates to history before updating
  if (currentRates.exists) {
    await db.collection("priceHistory").add({
      previousRates: currentRates.data(),
      replacedAt: admin.firestore.FieldValue.serverTimestamp(),
      replacedBy: request.auth.uid,
    });
  }

  // Build update object (only update provided fields)
  const updateData = {
    updatedBy: request.auth.uid,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    effectiveFrom: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (gold) {
    // Validate gold rates
    const validPurities = ["24K", "22K", "18K", "14K"];
    for (const purity of Object.keys(gold)) {
      if (!validPurities.includes(purity)) {
        throw new HttpsError("invalid-argument", `Invalid gold purity: ${purity}`);
      }
      if (typeof gold[purity] !== "number" || gold[purity] <= 0) {
        throw new HttpsError("invalid-argument", `Invalid rate for ${purity}: must be a positive number.`);
      }
    }
    updateData.gold = gold;
  }

  if (silver) {
    const validTypes = ["925_sterling", "999_pure"];
    for (const type of Object.keys(silver)) {
      if (!validTypes.includes(type)) {
        throw new HttpsError("invalid-argument", `Invalid silver type: ${type}`);
      }
      if (typeof silver[type] !== "number" || silver[type] <= 0) {
        throw new HttpsError("invalid-argument", `Invalid rate for ${type}: must be a positive number.`);
      }
    }
    updateData.silver = silver;
  }

  if (diamond) {
    for (const grade of Object.keys(diamond)) {
      if (typeof diamond[grade] !== "number" || diamond[grade] <= 0) {
        throw new HttpsError("invalid-argument", `Invalid diamond rate for ${grade}: must be a positive number.`);
      }
    }
    updateData.diamond = diamond;
  }

  if (platinum) {
    if (typeof platinum.perGram !== "number" || platinum.perGram <= 0) {
      throw new HttpsError("invalid-argument", "Invalid platinum rate: must be a positive number.");
    }
    updateData.platinum = platinum;
  }

  if (requiresApproval(adminData)) {
    // Store proposed rates in pendingApprovals only — current rates unchanged
    await db.collection("pendingApprovals").add({
      entityType: "metalRates",
      actionType: "update",
      entityId: "current",
      entityName: "Metal Rates Update",
      proposedChanges: updateData,
      previousState: currentRates.exists ? currentRates.data() : null,
      status: "pending",
      submittedBy: request.auth.uid,
      submittedByEmail: adminData.email,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
    });

    logActivity({ module: "metalRates", action: "update", entityId: "current", entityName: "Metal Rates", performedBy: request.auth.uid, performedByEmail: adminData.email, performedByRole: adminData.role, details: { pendingApproval: true, updatedCategories: [gold ? "gold" : null, silver ? "silver" : null, diamond ? "diamond" : null, platinum ? "platinum" : null].filter(Boolean) } });

    return {
      message: "Rate changes submitted for approval. Current rates remain unchanged until approved.",
      pendingApproval: true,
      updatedCategories: [
        gold ? "gold" : null,
        silver ? "silver" : null,
        diamond ? "diamond" : null,
        platinum ? "platinum" : null,
      ].filter(Boolean),
    };
  }

  // Use set with merge to handle first-time creation
  await ratesRef.set(updateData, { merge: true });

  logActivity({ module: "metalRates", action: "update", entityId: "current", entityName: "Metal Rates", performedBy: request.auth.uid, performedByEmail: adminData.email, performedByRole: adminData.role, details: { updatedCategories: [gold ? "gold" : null, silver ? "silver" : null, diamond ? "diamond" : null, platinum ? "platinum" : null].filter(Boolean) } });

  return {
    message: "Metal rates updated successfully. Product prices will be recalculated.",
    updatedCategories: [
      gold ? "gold" : null,
      silver ? "silver" : null,
      diamond ? "diamond" : null,
      platinum ? "platinum" : null,
    ].filter(Boolean),
  };
});

/**
 * Get current metal rates
 */
exports.getMetalRates = onCall({ region: "asia-south1" }, async (_request) => {
  const ratesDoc = await db.collection("metalRates").doc("current").get();

  if (!ratesDoc.exists) {
    throw new HttpsError("not-found", "Metal rates not configured yet.");
  }

  return ratesDoc.data();
});
