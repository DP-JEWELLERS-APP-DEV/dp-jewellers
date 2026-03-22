const admin = require('firebase-admin');
const serviceAccount = require('./firebase/functions/service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function run() {
  const email = 'verma.varun2810@gmail.com';
  try {
    const user = await admin.auth().getUserByEmail(email);
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
