const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { logActivity } = require("./activityLog");

const db = admin.firestore();

/**
 * Verify the caller is a super_admin
 */
async function verifySuperAdmin(auth) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const callerDoc = await db.collection("admins").doc(auth.uid).get();
  if (!callerDoc.exists || callerDoc.data().role !== "super_admin") {
    throw new HttpsError("permission-denied", "Only super admins can manage approvals.");
  }
  return callerDoc.data();
}

/**
 * List pending approvals (callable by super_admin only)
 * Supports filtering by status and entityType
 */
exports.listPendingApprovals = onCall({ region: "asia-south1" }, async (request) => {
  await verifySuperAdmin(request.auth);

  const { entityType, status = "pending" } = request.data || {};

  let query = db.collection("pendingApprovals")
    .where("status", "==", status)
    .orderBy("submittedAt", "desc");

  if (entityType) {
    query = query.where("entityType", "==", entityType);
  }

  query = query.limit(100);

  const snapshot = await query.get();
  const approvals = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return { approvals };
});

/**
 * Get count of pending approvals (for sidebar badge)
 */
exports.getPendingApprovalCount = onCall({ region: "asia-south1" }, async (request) => {
  await verifySuperAdmin(request.auth);

  const countResult = await db.collection("pendingApprovals")
    .where("status", "==", "pending")
    .count()
    .get();

  return { count: countResult.data().count };
});

/**
 * Review (approve or reject) a pending approval
 * On approve: applies the actual change to the target collection
 * On reject: marks as rejected
 */
exports.reviewApproval = onCall({ region: "asia-south1" }, async (request) => {
  const callerData = await verifySuperAdmin(request.auth);

  const { approvalId, decision, reviewNote } = request.data;

  if (!approvalId) {
    throw new HttpsError("invalid-argument", "approvalId is required.");
  }

  if (!decision || !["approved", "rejected"].includes(decision)) {
    throw new HttpsError("invalid-argument", "decision must be 'approved' or 'rejected'.");
  }

  const approvalRef = db.collection("pendingApprovals").doc(approvalId);
  const approvalDoc = await approvalRef.get();

  if (!approvalDoc.exists) {
    throw new HttpsError("not-found", "Approval request not found.");
  }

  const approval = approvalDoc.data();

  if (approval.status !== "pending") {
    throw new HttpsError("failed-precondition", "This approval has already been reviewed.");
  }

  // Apply the change if approved
  if (decision === "approved") {
    switch (approval.entityType) {
      case "product":
        await applyProductApproval(approval);
        break;
      case "metalRates":
        await applyMetalRatesApproval(approval, request.auth.uid);
        break;
      case "banner":
        await applyBannerApproval(approval);
        break;
      default:
        throw new HttpsError("internal", `Unknown entity type: ${approval.entityType}`);
    }
  }

  // If rejected and it was a product create, mark the product as rejected
  if (decision === "rejected" && approval.entityType === "product" && approval.actionType === "create") {
    if (approval.entityId) {
      const productRef = db.collection("products").doc(approval.entityId);
      const productDoc = await productRef.get();
      if (productDoc.exists) {
        await productRef.update({
          approvalStatus: "rejected",
          approvalNote: reviewNote || "Rejected by super admin.",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }

  // Clear approvalStatus on the entity if it was a pending update that got rejected
  if (decision === "rejected" && approval.entityType === "product" && approval.actionType === "update") {
    if (approval.entityId) {
      const productRef = db.collection("products").doc(approval.entityId);
      const productDoc = await productRef.get();
      if (productDoc.exists && productDoc.data().approvalStatus === "pending_update") {
        await productRef.update({
          approvalStatus: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }

  // Update the approval document
  await approvalRef.update({
    status: decision,
    reviewedBy: request.auth.uid,
    reviewedByEmail: callerData.email || "",
    reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    reviewNote: reviewNote || null,
  });

  logActivity({ module: "approvals", action: decision === "approved" ? "approve" : "reject", entityId: approvalId, entityName: `${approval.entityType}:${approval.entityName}`, performedBy: request.auth.uid, performedByEmail: callerData.email, performedByRole: "super_admin", details: { entityType: approval.entityType, actionType: approval.actionType, originalEntityId: approval.entityId, reviewNote: reviewNote || null } });

  return { approvalId, decision, message: `Approval ${decision} successfully.` };
});

/**
 * Apply an approved product change
 */
async function applyProductApproval(approval) {
  const { actionType, entityId, proposedChanges } = approval;

  switch (actionType) {
    case "create": {
      // Product was created with approvalStatus: "pending_approval" and isActive: false
      // Activate it now
      const productRef = db.collection("products").doc(entityId);
      const productDoc = await productRef.get();
      if (!productDoc.exists) {
        throw new HttpsError("not-found", "Product not found. It may have been deleted.");
      }
      const originalStatus = proposedChanges.originalStatus || "active";
      await productRef.update({
        isActive: originalStatus === "active" || originalStatus === "coming_soon",
        status: originalStatus,
        approvalStatus: "approved",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      break;
    }

    case "update": {
      // Apply the proposed changes to the live product
      const productRef = db.collection("products").doc(entityId);
      const productDoc = await productRef.get();
      if (!productDoc.exists) {
        throw new HttpsError("not-found", "Product not found. It may have been deleted.");
      }
      const updateData = { ...proposedChanges };
      updateData.approvalStatus = admin.firestore.FieldValue.delete();
      updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      await productRef.update(updateData);
      break;
    }

    case "archive": {
      const productRef = db.collection("products").doc(entityId);
      const productDoc = await productRef.get();
      if (!productDoc.exists) {
        throw new HttpsError("not-found", "Product not found.");
      }
      await productRef.update({
        status: "archived",
        isActive: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      break;
    }

    case "restore": {
      const productRef = db.collection("products").doc(entityId);
      const productDoc = await productRef.get();
      if (!productDoc.exists) {
        throw new HttpsError("not-found", "Product not found.");
      }
      await productRef.update({
        status: "active",
        isActive: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      break;
    }

    default:
      throw new HttpsError("internal", `Unknown product action: ${actionType}`);
  }
}

/**
 * Apply an approved metal rates change
 */
async function applyMetalRatesApproval(approval, reviewerUid) {
  const { proposedChanges } = approval;

  const ratesRef = db.collection("metalRates").doc("current");
  const currentRates = await ratesRef.get();

  // Save current rates to history before updating
  if (currentRates.exists) {
    await db.collection("priceHistory").add({
      previousRates: currentRates.data(),
      replacedAt: admin.firestore.FieldValue.serverTimestamp(),
      replacedBy: reviewerUid,
    });
  }

  // Apply the proposed rates
  const updateData = { ...proposedChanges };
  updateData.updatedBy = reviewerUid;
  updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  updateData.effectiveFrom = admin.firestore.FieldValue.serverTimestamp();

  await ratesRef.set(updateData, { merge: true });
  // The onMetalRatesUpdate Firestore trigger will automatically recalculate product prices
}

/**
 * Apply an approved banner change
 */
async function applyBannerApproval(approval) {
  const { actionType, entityId, proposedChanges } = approval;

  switch (actionType) {
    case "create": {
      // Check banner count limit
      const existingCount = await db.collection("banners").count().get();
      if (existingCount.data().count >= 5) {
        throw new HttpsError(
          "failed-precondition",
          "Maximum 5 banners allowed. Delete an existing banner before approving this one."
        );
      }
      const bannerData = { ...proposedChanges };
      bannerData.createdAt = admin.firestore.FieldValue.serverTimestamp();
      await db.collection("banners").add(bannerData);
      break;
    }

    case "update": {
      const bannerRef = db.collection("banners").doc(entityId);
      const bannerDoc = await bannerRef.get();
      if (!bannerDoc.exists) {
        throw new HttpsError("not-found", "Banner not found. It may have been deleted.");
      }
      const updateData = { ...proposedChanges };
      updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      await bannerRef.update(updateData);
      break;
    }

    case "delete": {
      const bannerRef = db.collection("banners").doc(entityId);
      const bannerDoc = await bannerRef.get();
      if (!bannerDoc.exists) {
        throw new HttpsError("not-found", "Banner not found. It may have already been deleted.");
      }
      await bannerRef.delete();
      break;
    }

    default:
      throw new HttpsError("internal", `Unknown banner action: ${actionType}`);
  }
}
