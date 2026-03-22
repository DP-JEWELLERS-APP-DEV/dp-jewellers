const admin = require('firebase-admin');

try {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch(e) {
  // Try default config if no key exists
  admin.initializeApp();
}

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
