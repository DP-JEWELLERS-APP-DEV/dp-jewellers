import { Text, View, Image } from 'react-native'
import React, { useEffect } from 'react'
import { Colors, Fonts, Screen } from '../constants/styles'
import MyStatusBar from '../components/myStatusBar'
import { useNavigation } from 'expo-router'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../lib/firebase'

const SplashScreen = () => {

    const navigation = useNavigation();

    useEffect(() => {
        let unsubscribe = null;
        const timer = setTimeout(() => {
            unsubscribe = onAuthStateChanged(auth, (user) => {
                navigation.replace('(tabs)')
                // if (user) {
                //     navigation.replace('(tabs)')
                // } else {
                //     navigation.replace('auth/loginScreen')
                // }
            })
        }, 800);
        return () => {
            clearTimeout(timer);
            if (unsubscribe) {
                unsubscribe();
            }
        }
    }, [])

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                {appIcon()}
            </View>
        </View>
    )

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
