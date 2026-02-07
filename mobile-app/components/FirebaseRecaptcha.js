import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Modal, View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

const FirebaseRecaptcha = forwardRef(({ firebaseConfig, onVerify, onError, hideUI = false }, ref) => {
  const [visible, setVisible] = useState(false);
  const phoneRef = useRef('');
  const resolveRef = useRef(null);
  const rejectRef = useRef(null);
  const webViewRef = useRef(null);

  // Expose sendOtp(phoneNumber) → Promise<verificationId>
  // The entire signInWithPhoneNumber flow runs inside the WebView where
  // a real RecaptchaVerifier works natively with Firebase's reCAPTCHA.
  useImperativeHandle(ref, () => ({
    sendOtp: (phoneNumber) => {
      return new Promise((resolve, reject) => {
        phoneRef.current = phoneNumber;
        resolveRef.current = resolve;
        rejectRef.current = reject;
        setVisible(true);
      });
    },
  }));

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'success' && data.verificationId) {
        setVisible(false);
        if (resolveRef.current) resolveRef.current(data.verificationId);
        if (onVerify) onVerify(data.verificationId);
      } else if (data.type === 'error') {
        setVisible(false);
        const error = new Error(data.message || 'Failed to send OTP');
        if (rejectRef.current) rejectRef.current(error);
        if (onError) onError(error);
      }
    } catch (e) {
      // Ignore non-JSON messages from WebView
    }
  };

  const configJson = JSON.stringify(firebaseConfig || {});
  const phoneJson = JSON.stringify(phoneRef.current || '');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: transparent;
      font-family: -apple-system, sans-serif;
    }
    #recaptcha-container { min-height: 80px; }
    #status {
      color: #666;
      margin-top: 16px;
      text-align: center;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div id="recaptcha-container"></div>
  <div id="status">Initializing...</div>
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"><\/script>
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"><\/script>
  <script>
    (function() {
      var statusEl = document.getElementById('status');
      try {
        var config = ${configJson};
        var phone = ${phoneJson};

        firebase.initializeApp(config);

        statusEl.textContent = 'Loading verification...';

        var verifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
          size: 'invisible',
          callback: function() {
            statusEl.textContent = 'Sending OTP...';
          }
        });

        firebase.auth().signInWithPhoneNumber(phone, verifier)
          .then(function(confirmationResult) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'success',
              verificationId: confirmationResult.verificationId
            }));
          })
          .catch(function(err) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: err.message || 'Failed to send OTP'
            }));
          });
      } catch (e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          message: e.message || 'Initialization error'
        }));
      }
    })();
  <\/script>
</body>
</html>`;

  const baseUrl = firebaseConfig?.authDomain
    ? `https://${firebaseConfig.authDomain}`
    : undefined;

  if (hideUI) {
    if (!visible) return null;
    return (
      <View style={styles.hiddenContainer} pointerEvents="none">
        <WebView
          ref={webViewRef}
          source={{ html, baseUrl }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => null}
          style={styles.hiddenWebview}
        />
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={styles.container}>
        <View style={styles.webviewContainer}>
          <WebView
            ref={webViewRef}
            source={{ html, baseUrl }}
            onMessage={handleMessage}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => <ActivityIndicator size="large" color="#000" style={styles.loader} />}
            style={styles.webview}
          />
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webviewContainer: {
    width: 350,
    height: 500,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
  },
  loader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20,
  },
  hiddenContainer: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    left: -1000,
    top: -1000,
  },
  hiddenWebview: {
    width: 1,
    height: 1,
  },
});

export default FirebaseRecaptcha;
