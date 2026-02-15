import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, LogBox, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
    </SafeAreaProvider>
  );
}
