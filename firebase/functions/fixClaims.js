const admin = require('firebase-admin');

// Since we're in the functions directory with GOOGLE_APPLICATION_CREDENTIALS set or using default auth
admin.initializeApp();

async function run() {
  const email = 'verma.varun2810@gmail.com';
  try {
    const user = await admin.auth().getUserByEmail(email);
    console.log('Found user:', user.uid);
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true,
      role: 'super_admin'
    });
    console.log('Successfully minted admin=true custom claim for UID:', user.uid);
  } catch(e) {
    console.error('Error:', e.message);
  }
}

run();
