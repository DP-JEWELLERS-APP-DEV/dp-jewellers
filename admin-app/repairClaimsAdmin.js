const admin = require("firebase-admin");
const path = require("path");

// Point to the known service account json file inside the functions directory
const serviceAccountPath = path.resolve(__dirname, "../firebase/functions/service-account.json");
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function run() {
  const email = "verma.varun2810@gmail.com";
  try {
    const user = await admin.auth().getUserByEmail(email);
    console.log("Found user profile UID:", user.uid);
    
    // Forcefully inject the admin: true Custom Claim into the Auth token
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true,
      role: "super_admin"
    });
    
    console.log("Successfully minted admin=true custom claim for UID:", user.uid);
    console.log("The user MUST logout and log back in on the Admin Panel for the new token to take effect.");
    process.exit(0);
  } catch (error) {
    console.error("Error setting custom claims:", error.message);
    process.exit(1);
  }
}

run();
