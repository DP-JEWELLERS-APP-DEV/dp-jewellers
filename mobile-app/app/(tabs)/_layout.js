import { Tabs } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { View, StyleSheet, BackHandler, Text, Pressable } from 'react-native'
import { Colors, Sizes, Fonts } from '../../constants/styles';
import React, { useState, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native';
import MyStatusBar from '../../components/myStatusBar';

export default function TabLayout() {

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

  const [backClickCount, setbackClickCount] = useState(0);

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
          tabBarStyle: { height: 65.0, backgroundColor: Colors.whiteColor, paddingTop: Sizes.fixPadding + 3.0 },
          tabBarHideOnKeyboard: true,
          tabBarButton: (props) => (
            <Pressable
              {...props}
              android_ripple={{ color: Colors.whiteColor }}
            />
          )
        }}
      >
        <Tabs.Screen
          name="home/homeScreen"
          options={{
            tabBarIcon: ({ focused, color }) => (
              <View style={{ alignItems: 'center' }}>
                <Feather name="home" size={24} color={color} />
                {focused ? <View style={styles.dotStyle} /> : null}
              </View>
            )
          }}
        />
        <Tabs.Screen
          name="search/searchScreen"
          options={{
            tabBarIcon: ({ focused, color }) => (
              <View style={{ alignItems: 'center' }}>
                <Feather name="search" size={24} color={color} />
                {focused ? <View style={styles.dotStyle} /> : null}
              </View>
            )
          }}
        />
        <Tabs.Screen
          name="cart/cartScreen"
          options={{
            tabBarIcon: ({ focused, color }) => (
              <View style={{ alignItems: 'center' }}>
                <MaterialCommunityIcons name="shopping-outline" size={26} color={color} />
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
                <Feather name="heart" size={24} color={color} />
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
                <Feather name="user" size={24} color={color} />
                {focused ? <View style={styles.dotStyle} /> : null}
              </View>
            )
          }} />
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
    bottom: 20,
    alignSelf: 'center',
    borderRadius: Sizes.fixPadding * 2.0,
    paddingHorizontal: Sizes.fixPadding + 5.0,
    paddingVertical: Sizes.fixPadding - 4.0,
  },
})
