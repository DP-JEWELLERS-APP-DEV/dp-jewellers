const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkIndex(name, query) {
    try {
        const snapshot = await query.limit(1).get();
        console.log(`✅ ${name} query successful. Found ${snapshot.size} docs.`);
    } catch (error) {
        console.error(`❌ ${name} query failed:`);
        console.error(error.message);
        if (error.details) console.error(error.details);
    }
}

async function listActiveBanners() {
    console.log('\n--- Active Banners ---');
    try {
        const snapshot = await db.collection('banners').where('isActive', '==', true).get();
        if (snapshot.empty) {
            console.log('No active banners found.');
            return;
        }
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`[${doc.id}] ${data.title} -> ${data.linkType}:${data.linkTarget}`);
        });
    } catch (error) {
        console.error('Error listing banners:', error.message);
    }
}

async function main() {
    console.log('--- Checking Firestore Indexes ---');

    // Featured Query
    const featuredQuery = db.collection('products')
        .where('isActive', '==', true)
        .where('featured', '==', true)
        .orderBy('createdAt', 'desc');
    await checkIndex('Featured (View All)', featuredQuery);

    // Bestseller Query
    const bestsellerQuery = db.collection('products')
        .where('isActive', '==', true)
        .where('bestseller', '==', true)
        .orderBy('createdAt', 'desc');
    await checkIndex('Bestseller (View All)', bestsellerQuery);

    await listActiveBanners();
}

main().catch(console.error);
