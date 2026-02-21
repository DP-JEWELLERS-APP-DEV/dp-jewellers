
// ----------------------------------------------------
// INSTRUCTIONS
// ----------------------------------------------------
// 1. Open your terminal in `firebase/functions`
// 2. Run: `npx firebase-tools functions:shell --project dp-jewellers-af660`
// 3. Once the shell prompt (>) appears, PASTE the entire script below:

(async () => {
    try {
        // 1. Find a valid product first
        const productsSnap = await db.collection("products")
            .where("isActive", "==", true)
            .limit(1)
            .get();

        if (productsSnap.empty) {
            console.error("No active products found to test with!");
            return;
        }

        const product = productsSnap.docs[0];
        const productId = product.id;
        const productData = product.data();

        console.log(`Found active product: ${productData.name} (${productId})`);

        // 2. Create Order using that product
        const result = await createOrder({
            data: {
                items: [
                    {
                        productId: productId,
                        quantity: 1
                    }
                ],
                deliveryType: "home_delivery",
                shippingAddress: {
                    name: "Test User",
                    address: "123 Test St",
                    city: "Test City",
                    state: "Test State",
                    pincode: "123456",
                    phone: "9999999999"
                },
                paymentMethod: "online"
            },
            auth: {
                uid: "manual_test_user",
                token: {
                    email: "test@example.com",
                    email_verified: true
                }
            }
        });

        console.log("------------------------------------------");
        console.log("SUCCESS! API Response:", JSON.stringify(result, null, 2));
        console.log("------------------------------------------");

    } catch (err) {
        console.error("ERROR Calling createOrder:", err);
    }
})();
