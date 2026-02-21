# Production Release Guide: DP Jewellers Android App

## Prerequisites

- Node.js installed
- EAS CLI installed: `npm install -g eas-cli`
- Access to Expo account: `officialaakash`
- Google Play Console account ($25 one-time fee at https://play.google.com/console)

---

## Step 1: Login to EAS

```bash
cd mobile-app
npx eas login
# Enter credentials for the 'officialaakash' Expo account
```

---

## Step 2: Generate Production Keystore

The keystore is a digital signature that proves the app comes from you. Google Play will reject updates signed with a different key, so **never lose this**.

```bash
npx eas credentials
```

Select these options in order:

```
1. Android
2. production
3. Keystore
4. Generate new keystore
```

EAS will generate and securely store the keystore on their servers. It will be used automatically during builds.

### Download a backup copy

```bash
npx eas credentials
# Select: Android → production → Keystore → Download keystore
```

**IMPORTANT:** Store the downloaded `.jks` file and the passwords in a safe place (password manager, company vault, etc). If this is lost and EAS goes down, the app can never be updated again.

---

## Step 3: Build the Production App Bundle

```bash
cd mobile-app
npx eas build --platform android --profile production
```

This will:

- Build an `.aab` (Android App Bundle) on EAS cloud servers
- Sign it with the production keystore
- Takes ~10-15 minutes
- Once done, EAS gives you a download link for the `.aab` file

Download the `.aab` file — this is what you upload to Google Play.

> **Note:** If you need a standalone APK for testing instead:
> `npx eas build --platform android --profile preview`

---

## Step 4: Set Up Google Play Console

1. Go to https://play.google.com/console
2. Pay the $25 registration fee (one-time)
3. Complete identity verification (can take 1-2 days)

---

## Step 5: Create the App in Play Console

1. Click **"Create app"**
2. Fill in:
   - App name: `DP Jewellers`
   - Default language: English (India)
   - App or Game: App
   - Free or Paid: Free
3. Accept policies and click **Create**

---

## Step 6: Complete Store Listing

Go to **Grow > Store listing** and fill in:

| Field             | What to provide                                                                 |
| ----------------- | ------------------------------------------------------------------------------- |
| App name          | DP Jewellers                                                                    |
| Short description | Up to 80 chars (e.g., "Shop gold & silver jewellery from DP Jewellers")         |
| Full description  | Up to 4000 chars describing the app                                             |
| App icon          | 512x512 PNG (resize from `assets/images/apk-logo.png`)                          |
| Feature graphic   | 1024x500 PNG (banner shown at top of listing)                                   |
| Phone screenshots | At least 2 screenshots, min 320px, max 3840px per side                          |
| Tablet screenshots| Optional but recommended (7-inch and 10-inch)                                   |

---

## Step 7: Complete Content Rating

Go to **Policy > App content > Content rating**:

1. Click **Start questionnaire**
2. Enter your email
3. Select category (likely "Utility, Productivity, Communication, or Other")
4. Answer the questions honestly
5. Click **Save > Submit**

---

## Step 8: Complete Data Safety Form

Go to **Policy > App content > Data safety** and declare:

| Data Type           | Collected? | Details                                       |
| ------------------- | ---------- | --------------------------------------------- |
| Name, Email, Phone  | Yes        | For user registration (Firebase Auth)          |
| Address             | Yes        | For shipping/delivery                          |
| Payment info        | Yes        | Processed via Razorpay (not stored in app)     |
| Purchase history    | Yes        | Order tracking                                |
| Photos              | No         | —                                             |
| Location            | No         | —                                             |

Also mark that:

- Data is encrypted in transit (Firebase uses HTTPS)
- Users can request data deletion
- Data is **not** shared with third parties (except Razorpay for payments)

---

## Step 9: Set Target Audience & App Category

- Go to **Policy > App content > Target audience** → Select **18+** or appropriate age
- Go to **Grow > Store listing > Categorization**:
  - Category: **Shopping**
  - Tags: Jewellery, Gold, Silver (pick relevant ones)

---

## Step 10: Set Up Pricing & Distribution

- Go to **Monetise > App pricing** → Select **Free**
- Go to **Reach > Countries/Regions** → Select India (and any others)

---

## Step 11: Create a Privacy Policy

Google requires a privacy policy URL. It should cover:

- What data you collect
- How you use it
- Third parties (Firebase, Razorpay)
- How users can delete their account/data

Host it on your website and add the URL in **Policy > App content > Privacy policy**.

---

## Step 12: Upload the AAB & Release

1. Go to **Production > Create new release**
2. Google will ask about **Play App Signing** — click **Continue** (recommended, Google manages the signing key for extra safety)
3. Click **Upload** and select the `.aab` file downloaded from EAS
4. Add release notes (e.g., "Initial release of DP Jewellers shopping app")
5. Click **Review release**
6. Click **Start rollout to Production**

---

## Step 13: Wait for Review

- First submission review: **1-7 days**
- Subsequent updates: **1-3 days**
- You'll get an email when approved or if changes are needed

---

## Pushing Future Updates

When releasing a new version:

1. Update version in `mobile-app/app.json`:
   - Bump `version` (e.g., `1.0.1` → `1.0.2`)
   - Bump `android.versionCode` (e.g., `2` → `3`) — **must always increase, never repeat**
   - Bump `ios.buildNumber` if doing iOS too

2. Build:
   ```bash
   cd mobile-app
   npx eas build --platform android --profile production
   ```

3. Download the new `.aab` from EAS

4. Go to Play Console → **Production > Create new release** → Upload new `.aab` → Submit

---

## Deploy Firebase Functions

Before or alongside the app release, deploy Cloud Functions:

```bash
cd /path/to/dp-jewellers
firebase deploy --only functions
```

To deploy everything (functions + rules + indexes):

```bash
firebase deploy
```

---

## Important Credentials & Info

| Item                 | Value / Location                                  |
| -------------------- | ------------------------------------------------- |
| Expo account         | `officialaakash`                                  |
| EAS Project ID       | `93795a8f-8cab-4d4a-9f83-713974d1b672`            |
| Android package name | `com.dpjewellers.app`                             |
| iOS bundle ID        | `com.dpjewellers.app`                             |
| Firebase Project     | `dp-jewellers-af660` (Firebase Console)            |
| Firebase region      | `asia-south1`                                     |
| Production keystore  | Stored in EAS (download backup via `npx eas credentials`) |

---

## Troubleshooting

### Build fails on EAS
- Run `npx expo doctor` to check for dependency issues
- Make sure `google-services.json` is in `mobile-app/` (download from Firebase Console > Project Settings > Android app)

### App rejected by Google Play
- Most common reasons: missing privacy policy, incomplete data safety form, or content rating
- Check the rejection email for specific reasons and fix accordingly

### Lost keystore
- If stored in EAS: `npx eas credentials` → Download keystore
- If EAS backup is also lost: you will need to create a new app listing (new package name) — the old app cannot be updated
