const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const db = admin.firestore();

/**
 * Log an admin activity. Fire-and-forget - errors are caught and logged
 * but never thrown to avoid disrupting the main operation.
 */
function logActivity(data) {
  const logEntry = {
    module: data.module || "unknown",
    action: data.action || "unknown",
    entityId: data.entityId || "",
    entityName: data.entityName || "",
    performedBy: data.performedBy || "",
    performedByEmail: data.performedByEmail || "",
    performedByRole: data.performedByRole || "",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    status: data.status || "success",
    details: data.details || {},
  };

  db.collection("activityLogs")
    .add(logEntry)
    .catch((err) => {
      console.error("Failed to write activity log:", err.message);
    });
}

/**
 * List activity logs with filters (super_admin only)
 */
exports.listActivityLogs = onCall(
  { region: "asia-south1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const callerDoc = await db
      .collection("admins")
      .doc(request.auth.uid)
      .get();
    if (!callerDoc.exists || callerDoc.data().role !== "super_admin") {
      throw new HttpsError(
        "permission-denied",
        "Only super admins can view activity logs."
      );
    }

    const {
      module: moduleFilter,
      action: actionFilter,
      dateFrom,
      dateTo,
      limit: queryLimit = 200,
      startAfterDoc,
    } = request.data || {};

    let query = db.collection("activityLogs").orderBy("timestamp", "desc");

    if (moduleFilter) {
      query = query.where("module", "==", moduleFilter);
    }
    if (actionFilter) {
      query = query.where("action", "==", actionFilter);
    }
    if (dateFrom) {
      query = query.where("timestamp", ">=", new Date(dateFrom));
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      query = query.where("timestamp", "<", endDate);
    }

    if (startAfterDoc) {
      const lastDoc = await db
        .collection("activityLogs")
        .doc(startAfterDoc)
        .get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    query = query.limit(Math.min(queryLimit, 500));

    let snapshot;
    try {
      snapshot = await query.get();
    } catch (err) {
      // Firestore composite index missing — extract the creation URL if present
      if (err.code === 9 && err.details && err.details.includes("create_composite")) {
        const urlMatch = err.details.match(/(https:\/\/console\.firebase\.google\.com\S+)/);
        console.error("Missing Firestore index. Create it here:", urlMatch ? urlMatch[1] : err.details);
        throw new HttpsError(
          "failed-precondition",
          "A database index is being created for this filter combination. Please try again in a few minutes."
        );
      }
      throw err;
    }

    const logs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      logs,
      count: logs.length,
      lastDoc:
        snapshot.docs.length > 0
          ? snapshot.docs[snapshot.docs.length - 1].id
          : null,
    };
  }
);

module.exports.logActivity = logActivity;
