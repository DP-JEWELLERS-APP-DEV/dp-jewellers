import { Tabs } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { View, StyleSheet, BackHandler, Text } from 'react-native'
import { Colors, Sizes, Fonts } from '../../constants/styles';
import React, { useState, useCallback, useEffect } from 'react'
import { useFocusEffect } from '@react-navigation/native';
import MyStatusBar from '../../components/myStatusBar';
import { onAuthStateChanged } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../../lib/firebase';

export default function TabLayout() {

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

  const fetchCounts = async () => {
    try {
      // Fetch cart count
      const getCart = httpsCallable(functions, 'getCart');
      const cartRes = await getCart();
      const cartItems = cartRes?.data?.cart || [];
      setCartCount(cartItems.length);

      // Fetch favorites count
      const getFavorites = httpsCallable(functions, 'getFavorites');
      const favRes = await getFavorites();
      const favItems = favRes?.data?.favorites || [];
      setFavoritesCount(favItems.length);
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
          tabBarActiveTintColor: Colors.primaryColor,
          tabBarInactiveTintColor: Colors.blackColor,
          tabBarShowLabel: false,
          tabBarStyle: { height: 60.0, backgroundColor: Colors.whiteColor, paddingTop: Sizes.fixPadding },
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
    backgroundColor: Colors.primaryColor,
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
