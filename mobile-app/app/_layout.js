import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { AppState, LogBox, StatusBar, Modal, View, Text, TouchableOpacity, StyleSheet, Linking, Platform, Image } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const PLAY_STORE_PACKAGE = 'com.render.rnexpo_jewelleryempire';
const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}&hl=en`;

/**
 * Fetch the latest published version from the Google Play Store page.
 * Returns null if the check fails (network error, scrape failure).
 */
async function getPlayStoreLatestVersion() {
  try {
    const res = await fetch(PLAY_STORE_URL, {
      headers: { 'Accept-Language': 'en-US' },
    });
    const html = await res.text();
    // Play Store embeds version in a data attribute like: "[[["1.0.4"]]]"
    const match = html.match(/\[\[\["(\d+\.\d+[\.\d]*)"\]\]\]/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Compare two semver strings. Returns true if latestVersion > currentVersion.
 */
function isNewer(latestVersion, currentVersion) {
  const parse = (v) => String(v).split('.').map(Number);
  const [la, lb, lc = 0] = parse(latestVersion);
  const [ca, cb, cc = 0] = parse(currentVersion);
  if (la !== ca) return la > ca;
  if (lb !== cb) return lb > cb;
  return lc > cc;
}

LogBox.ignoreAllLogs();

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {

  const [loaded] = useFonts({
    'Mukta-Regular': require('../assets/fonts/Mukta-Regular.ttf'),
    'Mukta-Medium': require('../assets/fonts/Mukta-Medium.ttf'),
    'Mukta-SemiBold': require('../assets/fonts/Mukta-SemiBold.ttf'),
    'Mukta-Bold': require('../assets/fonts/Mukta-Bold.ttf'),
    'Mukta-ExtraBold': require('../assets/fonts/Mukta-ExtraBold.ttf'),
    'Arya-Regular': require('../assets/fonts/Arya-Regular.ttf'),
  });

  const [updateInfo, setUpdateInfo] = useState(null); // { storeUrl, latestVersion, currentVersion }

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
    const subscription = AppState.addEventListener("change", (_) => {
      StatusBar.setBarStyle("dark-content");
    });
    return () => {
      subscription.remove();
    };
  }, [loaded]);

  // Check for app updates on launch (pure-JS, no native module needed)
  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const currentVersion = Constants.expoConfig?.version || Constants.manifest?.version;
        if (!currentVersion) return;
        const latestVersion = await getPlayStoreLatestVersion();
        if (latestVersion && isNewer(latestVersion, currentVersion)) {
          setUpdateInfo({
            storeUrl: PLAY_STORE_URL,
            latestVersion,
            currentVersion,
          });
        }
      } catch {
        // Silently ignore — no update info if check fails (e.g. no network)
      }
    };
    checkUpdate();
  }, []);

  const handleUpdate = () => {
    if (updateInfo?.storeUrl) {
      Linking.openURL(updateInfo.storeUrl);
    }
  };

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'ios_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/loginScreen" options={{ gestureEnabled: false }} />
        <Stack.Screen name="auth/registerScreen" />
        <Stack.Screen name="auth/verificationScreen" />
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="categoryWiseProducts/categoryWiseProductsScreen" />
        <Stack.Screen name="productDetail/productDetailScreen" />
        <Stack.Screen name="filter/filterScreen" />
        <Stack.Screen name="selectAddress/selectAddressScreen" />
        <Stack.Screen name="selectPaymentMethod/selectPaymentMethodScreen" />
        <Stack.Screen name="orderSuccessfull/orderSuccessfullScreen" options={{ gestureEnabled: false }} />
        <Stack.Screen name="editProfile/editProfileScreen" />
        <Stack.Screen name="orders/ordersScreen" />
        <Stack.Screen name="orderDetail/orderDetailScreen" />
        <Stack.Screen name="shippingAddresses/shippingAddressesScreen" />
        <Stack.Screen name="addNewAddress/addNewAddressScreen" />
        <Stack.Screen name="notifications/notificationsScreen" />
        <Stack.Screen name="contactUs/contactUsScreen" />
        <Stack.Screen name="termsAndCondition/termsAndConditionScreen" />
        <Stack.Screen name="privacyPolicy/privacyPolicyScreen" />
      </Stack>

      {/* App Update Modal */}
      <Modal
        visible={!!updateInfo}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}} // prevent hardware back from dismissing
      >
        <View style={updateStyles.overlay}>
          <View style={updateStyles.card}>
            <Image
              source={require('../assets/images/dp-logo-02.png')}
              style={updateStyles.logo}
              resizeMode="contain"
            />
            <Text style={updateStyles.title}>Update Available</Text>
            <Text style={updateStyles.message}>
              A new version of DP Jewellers is available.{'\n'}
              Please update to continue enjoying the best experience.
            </Text>
            {updateInfo?.latestVersion && (
              <View style={updateStyles.versionRow}>
                <Text style={updateStyles.versionText}>
                  v{updateInfo.currentVersion} → v{updateInfo.latestVersion}
                </Text>
              </View>
            )}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleUpdate}
              style={updateStyles.updateButton}
            >
              <Text style={updateStyles.updateButtonText}>Update Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setUpdateInfo(null)}
              style={updateStyles.laterButton}
            >
              <Text style={updateStyles.laterButtonText}>Remind Me Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaProvider>
  );
}

const updateStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: '#FFFDF4',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  logo: {
    width: 140,
    height: 50,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Mukta-SemiBold',
    color: '#1C1F32',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    fontFamily: 'Mukta-Regular',
    color: '#8C8577',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  versionRow: {
    backgroundColor: '#F4EEDC',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 13,
    fontFamily: 'Mukta-Medium',
    color: '#1C1F32',
  },
  updateButton: {
    backgroundColor: '#1C1F32',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  updateButtonText: {
    fontSize: 16,
    fontFamily: 'Mukta-SemiBold',
    color: '#FFFDF4',
    letterSpacing: 0.5,
  },
  laterButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  laterButtonText: {
    fontSize: 14,
    fontFamily: 'Mukta-Regular',
    color: '#8C8577',
  },
});
