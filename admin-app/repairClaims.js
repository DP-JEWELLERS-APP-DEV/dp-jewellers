const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable } = require('firebase/functions');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
require('dotenv').config({ path: './.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app, 'asia-south1');

async function run() {
  try {
    // We sign in as the super_admin
    await signInWithEmailAndPassword(auth, 'verma.varun2810@gmail.com', 'Admin@123');
    console.log('Logged in successfully!');

    // Call the repair function
    const setAdminClaims = httpsCallable(functions, 'setAdminClaims');
    const result = await setAdminClaims({ uid: auth.currentUser.uid });
    
    console.log('Function result:', result.data);
    console.log('You must now log out and log back in on the admin panel to receive the new token.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

run();
