# createOrder Function Review

Here is the current implementation of the `createOrder` function in `firebase/functions/src/orders.js`.
This function handles order creation and initializes the Razorpay order using the secrets.

```javascript
/**
 * Create a new order
 */
exports.createOrder = onCall({ region: "asia-south1", secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to place an order.");
  }

  const { items, deliveryType, shippingAddress, selectedStore, paymentMethod, couponCode, partialPayment } = request.data;

  // ... (validation logic) ...

  // ... (pricing calculation logic) ...

  const orderId = await generateOrderId();

  const order = {
    orderId,
    userId: request.auth.uid,
    // ... (order fields) ...
    paymentStatus: "pending",
    // ...
  };

  const docRef = await db.collection("orders").add(order);

  // Create Razorpay order
  let razorpayOrderId = null;
  try {
    const razorpay = getRazorpayInstance(); // Uses process.env.RAZORPAY_KEY_ID/SECRET
    const amountForPayment = partialPayment && deliveryType === "store_pickup"
      ? partialPayment.amountPaid
      : totalAmount;

    const razorpayOrder = await razorpay.orders.create({
      amount: amountForPayment * 100, // paise
      currency: "INR",
      receipt: orderId,
      notes: { orderDocId: docRef.id, userId: request.auth.uid },
    });

    razorpayOrderId = razorpayOrder.id;

    // Save razorpayOrderId back to the Firestore order
    await docRef.update({ razorpayOrderId });
  } catch (err) {
    // Clean up the pending order if Razorpay fails
    await docRef.delete();
    console.error("Razorpay order creation failed:", err);
    throw new HttpsError("internal", "Failed to initiate payment. Please try again.");
  }

  return {
    orderDocId: docRef.id,
    orderId,
    totalAmount,
    razorpayOrderId,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID, // Returns key to client
    message: "Order initiated. Complete payment to confirm.",
  };
});
```

## Key Points
- It uses `secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"]` configuration.
- It calls `getRazorpayInstance()` which uses these secrets.
- It creates an order on Razorpay and returns the `razorpayOrderId` and `razorpayKeyId` to the client.
