import { Tabs } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { View, StyleSheet, BackHandler, Text, DeviceEventEmitter } from 'react-native'
import { Colors, Sizes, Fonts } from '../../constants/styles';
import React, { useState, useCallback, useEffect } from 'react'
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MyStatusBar from '../../components/myStatusBar';
import { onAuthStateChanged } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../../lib/firebase';

// In-memory TTL cache for tab badge counts (avoids redundant Cloud Function calls on every tab switch)
const COUNTS_TTL_MS = 30000;
let _cachedCounts = null; // { cartCount, favoritesCount, fetchedAt }

export default function TabLayout() {

  const insets = useSafeAreaInsets();
  const [backClickCount, setbackClickCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);

  const backAction = () => {
    backClickCount == 1 ? BackHandler.exitApp() : _spring();
    return true;
  };

  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => {
        backHandler.remove();
      };
    }, [backAction])
  );

  function _spring() {
    setbackClickCount(1)
    setTimeout(() => {
      setbackClickCount(0)
    }, 1000)
  }

  // Fetch cart and favorites counts
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        fetchCounts();
      } else {
        setCartCount(0);
        setFavoritesCount(0);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen for cart/favorites updates from anywhere in the app — force refresh to invalidate cache
  useEffect(() => {
    const forceRefresh = () => {
      _cachedCounts = null; // invalidate cache
      if (auth?.currentUser) fetchCounts(true);
    };
    const cartSub = DeviceEventEmitter.addListener('cartUpdated', forceRefresh);
    const favSub = DeviceEventEmitter.addListener('favoritesUpdated', forceRefresh);
    return () => {
      cartSub.remove();
      favSub.remove();
    };
  }, []);

  const fetchCounts = async (force = false) => {
    // Skip if fresh data is available in cache (within TTL)
    if (!force && _cachedCounts && (Date.now() - _cachedCounts.fetchedAt < COUNTS_TTL_MS)) {
      setCartCount(_cachedCounts.cartCount);
      setFavoritesCount(_cachedCounts.favoritesCount);
      return;
    }
    try {
      // Fetch cart and favorites in parallel to save time
      const [cartRes, favRes] = await Promise.all([
        httpsCallable(functions, 'getCart')(),
        httpsCallable(functions, 'getFavorites')(),
      ]);
      const cartCount = (cartRes?.data?.cart || []).length;
      const favCount = (favRes?.data?.favorites || []).length;
      _cachedCounts = { cartCount, favoritesCount: favCount, fetchedAt: Date.now() };
      setCartCount(cartCount);
      setFavoritesCount(favCount);
    } catch (err) {
      // Ignore errors
    }
  };

  // Refresh counts when tabs are focused
  useFocusEffect(
    useCallback(() => {
      if (auth?.currentUser) {
        fetchCounts();
      }
    }, [])
  );

  return (
    <View style={{ flex: 1 }}>
      <MyStatusBar />
      <Tabs
        initialRouteName="home/homeScreen"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.whiteColor,
          tabBarInactiveTintColor: Colors.whiteColor,
          tabBarShowLabel: false,
          tabBarStyle: { height: 60.0 + insets.bottom, backgroundColor: Colors.blackColor, paddingTop: Sizes.fixPadding, paddingBottom: insets.bottom },
          tabBarHideOnKeyboard: true,
        }}
      >
        {/* Home tab - now visible in bottom bar */}
        <Tabs.Screen
          name="home/homeScreen"
          options={{
            tabBarIcon: ({ focused, color }) => (
              <View style={{ alignItems: 'center' }}>
                <Feather name="home" size={22} color={color} />
                {focused ? <View style={styles.dotStyle} /> : null}
              </View>
            )
          }}
        />
        {/* Search tab - hidden since search is available at top */}
        <Tabs.Screen
          name="search/searchScreen"
          options={{
            href: null, // Exclude from tab navigation - search is available at top
            tabBarItemStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            href: null, // Prevent index route from rendering as a tab
            tabBarItemStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="cart/cartScreen"
          options={{
            tabBarIcon: ({ focused, color }) => (
              <View style={{ alignItems: 'center' }}>
                <View>
                  <MaterialCommunityIcons name="shopping-outline" size={24} color={color} />
                  {cartCount > 0 && (
                    <View style={styles.badgeStyle}>
                      <Text style={styles.badgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
                    </View>
                  )}
                </View>
                {focused ? <View style={styles.dotStyle} /> : null}
              </View>
            )
          }}
        />
        <Tabs.Screen
          name="favorite/favoriteScreen"
          options={{
            tabBarIcon: ({ focused, color }) => (
              <View style={{ alignItems: 'center' }}>
                <View>
                  <Feather name="heart" size={22} color={color} />
                  {favoritesCount > 0 && (
                    <View style={styles.badgeStyle}>
                      <Text style={styles.badgeText}>{favoritesCount > 9 ? '9+' : favoritesCount}</Text>
                    </View>
                  )}
                </View>
                {focused ? <View style={styles.dotStyle} /> : null}
              </View>
            )
          }}
        />
        <Tabs.Screen
          name="profile/profileScreen"
          options={{
            tabBarIcon: ({ focused, color }) => (
              <View style={{ alignItems: 'center' }}>
                <Feather name="user" size={22} color={color} />
                {focused ? <View style={styles.dotStyle} /> : null}
              </View>
            )
          }}
        />
      </Tabs>
      {backClickCount == 1 ? exitInfo() : null}
    </View>
  );

  function exitInfo() {
    return (
      <View style={styles.exitWrapStyle}>
        <Text style={{ ...Fonts.whiteColor16Medium }}>
          Press Back Once Again to Exit
        </Text>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  dotStyle: {
    backgroundColor: Colors.whiteColor,
    width: 6.0,
    height: 6.0,
    borderRadius: 3.0,
    marginTop: Sizes.fixPadding - 5.0
  },
  exitWrapStyle: {
    backgroundColor: Colors.blackColor,
    position: "absolute",
    bottom: 80,
    alignSelf: 'center',
    borderRadius: Sizes.fixPadding * 2.0,
    paddingHorizontal: Sizes.fixPadding + 5.0,
    paddingVertical: Sizes.fixPadding - 4.0,
  },
  badgeStyle: {
    position: 'absolute',
    top: -5,
    right: -8,
    backgroundColor: Colors.redColor,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.whiteColor,
    fontSize: 10,
    fontWeight: 'bold',
  },
})
