const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { logActivity } = require("./activityLog");

const db = admin.firestore();

/**
 * Create an admin user (callable by super_admin only)
 * Sets custom claims and creates admin document in Firestore
 */
exports.createAdmin = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  // Verify caller is super_admin
  const callerDoc = await db.collection("admins").doc(request.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data().role !== "super_admin") {
    throw new HttpsError("permission-denied", "Only super admins can create admin accounts.");
  }

  const { email, role, permissions } = request.data;

  if (!email) {
    throw new HttpsError("invalid-argument", "Email is required.");
  }

  const validRoles = ["super_admin", "admin", "editor"];
  if (!role || !validRoles.includes(role)) {
    throw new HttpsError("invalid-argument", `Invalid role. Must be one of: ${validRoles.join(", ")}`);
  }

  // Check if user exists in Firebase Auth
  let userRecord;
  let isNewUser = false;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      // Auto-create the Firebase Auth user with a temporary password
      try {
        const { randomBytes } = require("crypto");
        const tempPassword = randomBytes(16).toString("hex");
        userRecord = await admin.auth().createUser({
          email: email,
          password: tempPassword,
        });
        isNewUser = true;
      } catch (createError) {
        throw new HttpsError(
          "internal",
          `Failed to create user account for ${email}: ${createError.message}`
        );
      }
    } else {
      throw new HttpsError("internal", "Error looking up user.");
    }
  }

  // Set custom claims for admin
  await admin.auth().setCustomUserClaims(userRecord.uid, {
    admin: true,
    role: role,
  });

  // Create admin document in Firestore
  const adminData = {
    email: email,
    role: role,
    permissions: permissions || {
      manageProducts: role === "super_admin" || role === "admin",
      manageOrders: role === "super_admin" || role === "admin",
      manageRates: role === "super_admin" || role === "admin",
      managePromotions: role === "super_admin" || role === "admin",
      manageUsers: role === "super_admin" || role === "admin",
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: request.auth.uid,
    isActive: true,
    skipApproval: false,
  };

  await db.collection("admins").doc(userRecord.uid).set(adminData);

  logActivity({ module: "adminUsers", action: "create", entityId: userRecord.uid, entityName: email, performedBy: request.auth.uid, performedByEmail: callerDoc.data().email, performedByRole: "super_admin", details: { role, isNewUser } });

  return {
    adminId: userRecord.uid,
    email,
    role,
    isNewUser,
    message: isNewUser
      ? `Admin account created for ${email} with role: ${role}. The admin should use "Forgot Password" on the login page to set their password.`
      : `Admin account created for ${email} with role: ${role}.`,
  };
});

/**
 * Set admin custom claims (for initial bootstrap or repair)
 * This is a special function - first call can be made without admin verification
 * if no admins exist yet (bootstrap mode)
 */
exports.setAdminClaims = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  // Check if any admins exist (bootstrap mode)
  const adminsSnapshot = await db.collection("admins")
    .where("isActive", "==", true)
    .limit(1)
    .get();

  const isBootstrap = adminsSnapshot.empty;

  if (!isBootstrap) {
    // Normal mode - verify caller is super_admin
    const callerDoc = await db.collection("admins").doc(request.auth.uid).get();
    if (!callerDoc.exists || callerDoc.data().role !== "super_admin") {
      throw new HttpsError("permission-denied", "Only super admins can set admin claims.");
    }
  }

  const { uid } = request.data;
  const targetUid = uid || request.auth.uid;

  // In bootstrap mode, only allow setting claims for the caller
  if (isBootstrap && targetUid !== request.auth.uid) {
    throw new HttpsError("permission-denied", "In bootstrap mode, you can only set claims for yourself.");
  }

  // Set custom claims
  await admin.auth().setCustomUserClaims(targetUid, {
    admin: true,
    role: "super_admin",
  });

  // Create admin document if it doesn't exist
  const adminRef = db.collection("admins").doc(targetUid);
  const adminDoc = await adminRef.get();

  if (!adminDoc.exists) {
    const userRecord = await admin.auth().getUser(targetUid);
    await adminRef.set({
      email: userRecord.email || "",
      role: "super_admin",
      permissions: {
        manageProducts: true,
        manageOrders: true,
        manageRates: true,
        managePromotions: true,
        manageUsers: true,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
    });
  }

  return {
    uid: targetUid,
    message: isBootstrap
      ? "Bootstrap complete. You are now a super admin. Sign out and sign back in for claims to take effect."
      : "Admin claims updated. User must sign out and back in for changes to take effect.",
  };
});

/**
 * List all admin users (callable by super_admin only)
 */
exports.listAdmins = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const callerDoc = await db.collection("admins").doc(request.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data().role !== "super_admin") {
    throw new HttpsError("permission-denied", "Only super admins can list admin accounts.");
  }

  const snapshot = await db.collection("admins").get();
  const admins = snapshot.docs.map((doc) => ({
    uid: doc.id,
    ...doc.data(),
  }));

  return { admins };
});

/**
 * Update an admin user's role and permissions (callable by super_admin only)
 * Cannot update super_admin accounts
 */
exports.updateAdmin = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const callerDoc = await db.collection("admins").doc(request.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data().role !== "super_admin") {
    throw new HttpsError("permission-denied", "Only super admins can update admin accounts.");
  }

  const { uid, role, permissions, skipApproval } = request.data;

  if (!uid) {
    throw new HttpsError("invalid-argument", "Admin uid is required.");
  }

  const targetDoc = await db.collection("admins").doc(uid).get();
  if (!targetDoc.exists) {
    throw new HttpsError("not-found", "Admin not found.");
  }

  if (targetDoc.data().role === "super_admin") {
    throw new HttpsError("permission-denied", "Cannot modify a super admin account.");
  }

  const updateData = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (role) {
    const validRoles = ["admin", "editor"];
    if (!validRoles.includes(role)) {
      throw new HttpsError("invalid-argument", `Invalid role. Must be one of: ${validRoles.join(", ")}`);
    }
    updateData.role = role;

    // Update custom claims
    await admin.auth().setCustomUserClaims(uid, { admin: true, role });
  }

  if (permissions) {
    updateData.permissions = permissions;
  }

  if (typeof skipApproval === "boolean") {
    updateData.skipApproval = skipApproval;
  }

  await db.collection("admins").doc(uid).update(updateData);

  logActivity({ module: "adminUsers", action: "update", entityId: uid, entityName: targetDoc.data().email || uid, performedBy: request.auth.uid, performedByEmail: callerDoc.data().email, performedByRole: "super_admin", details: { changedFields: Object.keys(updateData).filter(k => k !== "updatedAt") } });

  return { uid, message: "Admin updated successfully." };
});

/**
 * Deactivate an admin user (callable by super_admin only)
 * Cannot deactivate super_admin accounts
 */
exports.deactivateAdmin = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const callerDoc = await db.collection("admins").doc(request.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data().role !== "super_admin") {
    throw new HttpsError("permission-denied", "Only super admins can deactivate admin accounts.");
  }

  const { uid } = request.data;

  if (!uid) {
    throw new HttpsError("invalid-argument", "Admin uid is required.");
  }

  if (uid === request.auth.uid) {
    throw new HttpsError("failed-precondition", "Cannot deactivate your own account.");
  }

  const targetDoc = await db.collection("admins").doc(uid).get();
  if (!targetDoc.exists) {
    throw new HttpsError("not-found", "Admin not found.");
  }

  if (targetDoc.data().role === "super_admin") {
    throw new HttpsError("permission-denied", "Cannot deactivate a super admin account.");
  }

  await db.collection("admins").doc(uid).update({
    isActive: false,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Remove admin custom claims
  await admin.auth().setCustomUserClaims(uid, { admin: false });

  logActivity({ module: "adminUsers", action: "deactivate", entityId: uid, entityName: targetDoc.data().email || uid, performedBy: request.auth.uid, performedByEmail: callerDoc.data().email, performedByRole: "super_admin" });

  return { uid, message: "Admin deactivated successfully." };
});

/**
 * Reactivate an admin user (callable by super_admin only)
 */
exports.reactivateAdmin = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const callerDoc = await db.collection("admins").doc(request.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data().role !== "super_admin") {
    throw new HttpsError("permission-denied", "Only super admins can reactivate admin accounts.");
  }

  const { uid } = request.data;

  if (!uid) {
    throw new HttpsError("invalid-argument", "Admin uid is required.");
  }

  const targetDoc = await db.collection("admins").doc(uid).get();
  if (!targetDoc.exists) {
    throw new HttpsError("not-found", "Admin not found.");
  }

  const targetData = targetDoc.data();

  await db.collection("admins").doc(uid).update({
    isActive: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Restore admin custom claims
  await admin.auth().setCustomUserClaims(uid, {
    admin: true,
    role: targetData.role || "admin",
  });

  logActivity({ module: "adminUsers", action: "reactivate", entityId: uid, entityName: targetDoc.data().email || uid, performedBy: request.auth.uid, performedByEmail: callerDoc.data().email, performedByRole: "super_admin" });

  return { uid, message: "Admin reactivated successfully." };
});
