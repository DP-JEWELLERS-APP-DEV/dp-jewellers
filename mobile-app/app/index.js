import { Text, View, Image } from 'react-native'
import React, { useEffect } from 'react'
import { Colors, Fonts, Screen } from '../constants/styles'
import MyStatusBar from '../components/myStatusBar'
import { useNavigation } from 'expo-router'

const SplashScreen = () => {

    const navigation = useNavigation();

    useEffect(() => {
        const timer = setTimeout(() => {
            // Skip auth for now to preview the app without backend.
            navigation.push('(tabs)')
        }, 2000);
        return () => {
            clearTimeout(timer);
        }
    }, [])

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                {appIcon()}
                {appName()}
            </View>
        </View>
    )

    function appName() {
        return (
            <Text style={{ ...Fonts.blackColor26AryaRegular }}>
                JEWELRY EMPIRE
            </Text>
        )
    }

    function appIcon() {
        return (
            <Image
                source={require('../assets/images/dp-logo-01.png')}
                style={{ width: Screen.width / 2.2, height: Screen.width / 2.2, resizeMode: 'contain' }}
            />
        )
    }
}

export default SplashScreen
