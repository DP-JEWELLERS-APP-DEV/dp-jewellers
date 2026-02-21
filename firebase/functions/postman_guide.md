# Postman Verification Guide

## 1. Get an Authentication Token (Required) Since the API requires login (`request.auth`), you first need a valid ID Token.

### Option A: Use a Test User (Do you have one?)
Run this curl command in your terminal to get an `idToken`:

```bash
curl 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyC_CYeG1dUZGF_lG_XS1XtcZKgm-OB8tAw' \
  -H 'Content-Type: application/json' \
  --data-binary '{"email":"[YOUR_TEST_EMAIL]","password":"[YOUR_TEST_PASSWORD]","returnSecureToken":true}'
```

*Identify the `idToken` in the response.*

---

## 2. Call `createOrder` API

**Method:** `POST`
**URL:** `https://asia-south1-dp-jewellers-af660.cloudfunctions.net/createOrder`

**Headers:**
- `Content-Type`: `application/json`
- `Authorization`: `Bearer [PASTE_YOUR_ID_TOKEN_HERE]`

**Body (JSON):**
```json
{
  "data": {
    "items": [
      {
        "productId": "[VALID_PRODUCT_ID_FROM_DB]",
        "quantity": 1
      }
    ],
    "deliveryType": "home_delivery",
    "shippingAddress": {
      "name": "Postman User",
      "address": "123 Postman St",
      "city": "Test City",
      "state": "Test State",
      "pincode": "123456",
      "phone": "9999999999"
    },
    "paymentMethod": "online"
  }
}
```

---

## Troubleshooting
- **Unauthenticated**: You forgot the Bearer token or it expired.
- **Not Found**: The `productId` is wrong. Check Firestore for a valid ID.
- **Internal Error**: Check the Firebase logs for details.
