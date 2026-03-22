import {
  getAuth,
  verifyPhoneNumber,
  PhoneAuthState,
} from '@react-native-firebase/auth';

/**
 * Send OTP via native Firebase Phone Auth.
 * Uses verifyPhoneNumber listener which works on emulators with test numbers.
 * Returns verificationId for use in verificationScreen.
 */
export function sendPhoneOtpNative(phoneNumber) {
  return new Promise((resolve, reject) => {
    const authInstance = getAuth();
    verifyPhoneNumber(authInstance, phoneNumber).on(
      'state_changed',
      (snapshot) => {
        if (snapshot.state === PhoneAuthState.CODE_SENT) {
          resolve(snapshot.verificationId);
        } else if (snapshot.state === PhoneAuthState.AUTO_VERIFIED) {
          resolve(snapshot.verificationId);
        } else if (snapshot.state === PhoneAuthState.ERROR) {
          reject(snapshot.error || new Error('Failed to send OTP. Please try again.'));
        }
      },
      (error) => {
        reject(error || new Error('Failed to send OTP. Please try again.'));
      },
    );
  });
}
