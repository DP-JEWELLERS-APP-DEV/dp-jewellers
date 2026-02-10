const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { logActivity } = require("./activityLog");
const db = admin.firestore();

async function verifySuperAdmin(auth) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const callerDoc = await db.collection("admins").doc(auth.uid).get();
  if (!callerDoc.exists || callerDoc.data().role !== "super_admin") {
    throw new HttpsError("permission-denied", "Only super admins can update contact details.");
  }
  return callerDoc.data();
}

async function verifyAdmin(auth) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const callerDoc = await db.collection("admins").doc(auth.uid).get();
  if (!callerDoc.exists || !callerDoc.data().isActive) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  return callerDoc.data();
}

exports.getContactDetails = onCall({ region: "asia-south1" }, async (request) => {
  await verifyAdmin(request.auth);

  const docRef = db.collection("contactDetails").doc("current");
  const doc = await docRef.get();

  if (!doc.exists) {
    return { exists: false };
  }

  return { exists: true, ...doc.data() };
});

exports.updateContactDetails = onCall({ region: "asia-south1" }, async (request) => {
  const adminData = await verifySuperAdmin(request.auth);

  const { storeName, address, phone, alternatePhone, email, whatsapp, businessHours } = request.data;

  if (!storeName || !address || !phone || !email) {
    throw new HttpsError("invalid-argument", "Store name, address, phone, and email are required.");
  }

  const updateData = {
    storeName,
    address,
    phone,
    alternatePhone: alternatePhone || "",
    email,
    whatsapp: whatsapp || "",
    businessHours: {
      weekdays: businessHours?.weekdays || "",
      saturday: businessHours?.saturday || "",
      sunday: businessHours?.sunday || "",
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: request.auth.uid,
  };

  await db.collection("contactDetails").doc("current").set(updateData, { merge: true });

  logActivity({ module: "support", action: "update", entityId: "current", entityName: storeName || "Contact Details", performedBy: request.auth.uid, performedByEmail: adminData.email, performedByRole: adminData.role });

  return { message: "Contact details updated successfully." };
});
