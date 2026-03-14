import React, { forwardRef, useImperativeHandle, useState, useRef } from 'react';
import { View, Modal, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import auth from '@react-native-firebase/auth';

const FirebaseRecaptcha = forwardRef(({ firebaseConfig, onVerify, onError, hideUI = false }, ref) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const webViewRef = useRef(null);
  const [currentPhone, setCurrentPhone] = useState(null);
  const resolveRef = useRef(null);
  const rejectRef = useRef(null);

  const configJson = JSON.stringify(firebaseConfig);
  const baseUrl = `https://${firebaseConfig.authDomain}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
        <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>
      </head>
      <body>
        <div id="recaptcha-container"></div>
        <script>
          function log(msg) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: msg }));
          }

          try {
            var config = ${configJson};
            firebase.initializeApp(config);
            
            var globalVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
              size: '${hideUI ? 'invisible' : 'normal'}',
              callback: function(token) {
                log('Recaptcha Solved Successfully');
              },
              'expired-callback': function() {
                log('Recaptcha Expired');
              }
            });

            window.sendOtp = function(phoneNumber) {
              log('WebView: Starting OTP for ' + phoneNumber);
              firebase.auth().signInWithPhoneNumber(phoneNumber, globalVerifier)
                .then(function(confirmationResult) {
                  log('WebView: Success!');
                  window.ReactNativeWebView.postMessage(JSON.stringify({ 
                    type: 'success', 
                    verificationId: confirmationResult.verificationId 
                  }));
                })
                .catch(function(error) {
                  log('WebView Error: ' + error.code + ' - ' + error.message);
                  window.ReactNativeWebView.postMessage(JSON.stringify({ 
                    type: 'error', 
                    code: error.code,
                    message: error.message 
                  }));
                });
            };

            log('WebView Ready on ' + window.location.origin);
            if ('${hideUI}' === 'true') {
                globalVerifier.render();
            }
          } catch(e) {
            log('WebView Init Error: ' + e.message);
          }
        </script>
      </body>
    </html>
  `;

  useImperativeHandle(ref, () => ({
    sendOtp: async (phoneNumber) => {
      console.log('[Auth Strategy]: Attempting Native SDK first...');
      try {
        // Try native first (Fastest)
        const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
        console.log('[Native SDK]: Success');
        if (onVerify) onVerify(confirmation.verificationId);
        return confirmation.verificationId;
      } catch (err) {
        console.warn('[Native SDK]: Failed (Expected on Emu). Falling back to WebView...', err.code);
        
        // Fallback to WebView
        setCurrentPhone(phoneNumber);
        setModalVisible(true);
        if (hideUI) setLoading(true);

        return new Promise((resolve, reject) => {
          resolveRef.current = resolve;
          rejectRef.current = reject;
        });
      }
    },
  }));

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'log') {
        console.log('[WebView Log]:', data.message);
      } else if (data.type === 'success') {
        setModalVisible(false);
        setLoading(false);
        if (resolveRef.current) resolveRef.current(data.verificationId);
        if (onVerify) onVerify(data.verificationId);
      } else if (data.type === 'error') {
        setModalVisible(false);
        setLoading(false);
        const error = new Error(data.message || 'Failed to send OTP');
        if (rejectRef.current) rejectRef.current(error);
        if (onError) onError(error);
      }
    } catch (e) {
      console.error('Message Parse Error:', e);
    }
  };

  return (
    <Modal
      visible={modalVisible}
      transparent={hideUI}
      animationType="slide"
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={hideUI ? styles.invisibleContainer : styles.visibleContainer}>
        {!hideUI && (
          <View style={styles.header}>
            <Text style={styles.headerText}>Verification Required</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButton}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent, baseUrl: baseUrl }}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onLoadEnd={() => {
            if (currentPhone) {
              webViewRef.current.injectJavaScript(`window.sendOtp("${currentPhone}");`);
            }
          }}
          style={hideUI ? styles.invisibleWebView : styles.visibleWebView}
        />

        {loading && hideUI && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Securing connection...</Text>
          </View>
        )}
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  invisibleContainer: {
    height: 0,
    width: 0,
    opacity: 0,
  },
  visibleContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 50,
  },
  invisibleWebView: {
    height: 0,
    width: 0,
    opacity: 0,
  },
  visibleWebView: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    color: '#007AFF',
    fontSize: 16,
  }
});

export default FirebaseRecaptcha;
