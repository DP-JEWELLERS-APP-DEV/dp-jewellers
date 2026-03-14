/**
 * Web stub - native phone auth is not used on web.
 * Web uses FirebaseRecaptcha (WebView) in loginScreen/registerScreen.
 * This file is only used when .native.js is not (e.g. web bundling).
 */
export async function sendPhoneOtpNative() {
  throw new Error('Native phone auth is not available on web. Use FirebaseRecaptcha flow.');
}
