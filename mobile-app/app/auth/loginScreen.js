import { StyleSheet, Text, View, BackHandler, Image, TextInput, ScrollView, TouchableOpacity } from 'react-native'
import React, { useState, useCallback, useRef } from 'react'
import { Colors, Fonts, Sizes, Screen } from "../../constants/styles";
import { useFocusEffect } from '@react-navigation/native';
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { PhoneAuthProvider } from 'firebase/auth';
import { auth, firebaseConfig } from '../../lib/firebase';

const LoginScreen = () => {

    const navigation = useNavigation();

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
    const [phoneNumber, setphoneNumber] = useState('+91');
    const [loading, setloading] = useState(false);
    const [errorText, seterrorText] = useState('');
    const recaptchaVerifier = useRef(null);

    const normalizePhone = (value) => {
        const trimmed = String(value || '').trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('+')) return trimmed;
        if (trimmed.startsWith('0')) return `+91${trimmed.slice(1)}`;
        return `+91${trimmed}`;
    };

    const sendOtp = async () => {
        const normalized = normalizePhone(phoneNumber);
        if (!normalized || normalized.length < 10) {
            seterrorText('Please enter a valid phone number.');
            return;
        }
        setloading(true);
        seterrorText('');
        try {
            const provider = new PhoneAuthProvider(auth);
            const verificationId = await provider.verifyPhoneNumber(
                normalized,
                recaptchaVerifier.current
            );
            navigation.push('auth/verificationScreen', {
                verificationId,
                phoneNumber: normalized,
                mode: 'login',
            });
        } catch (err) {
            seterrorText('Failed to send OTP. Please try again.');
        } finally {
            setloading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <ScrollView
                automaticallyAdjustKeyboardInsets={true}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Sizes.fixPadding * 2.0 }}
            >
                {heroSection()}
                <FirebaseRecaptchaVerifierModal
                    ref={recaptchaVerifier}
                    firebaseConfig={firebaseConfig}
                    attemptInvisibleVerification={true}
                />
                {cardSection()}
            </ScrollView>
            {backClickCount == 1 ? exitInfo() : null}
        </View>
    )

    function exitInfo() {
        return (
            <View style={styles.exitWrapStyle}>
                <Text style={{ ...Fonts.whiteColor16Medium }}>
                    Press Back Once Again to Exit
                </Text>
            </View>
        )
    }

    function heroSection() {
        return (
            <View style={styles.heroWrap}>
                <Image
                    source={require('../../assets/images/login-banner.jpg')}
                    style={styles.heroImage}
                />
               
            </View>
        )
    }

    function cardSection() {
        return (
            <View style={styles.card}>
                <Text style={styles.titleText}>Welcome Back!</Text>
                <Text style={styles.subtitleText}>Enter your phone number to continue</Text>
                {phoneNumberInfo()}
                {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
                {loginButton()}
                {orDivider()}
                {signUpButton()}
            </View>
        )
    }

    function orDivider() {
        return (
            <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>or</Text>
                <View style={styles.orLine} />
            </View>
        )
    }

    function loginButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={sendOtp}
                style={styles.primaryButton}
                disabled={loading}
            >
                <Text style={styles.primaryButtonText}>{loading ? 'Sending OTP...' : 'Send OTP'}</Text>
            </TouchableOpacity>
        )
    }

    function signUpButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => { navigation.push('auth/registerScreen') }}
                style={styles.outlineButton}
            >
                <Text style={styles.outlineButtonText}>Sign Up</Text>
            </TouchableOpacity>
        )
    }

    function phoneNumberInfo() {
        return (
            <View style={{ marginTop: Sizes.fixPadding * 2.0 }}>
                <Text style={styles.inputLabel}>Phone</Text>
                <View style={styles.inputRow}>
                    <Feather name="phone" size={18} color={Colors.grayColor} />
                    <TextInput
                        placeholder='Enter phone number'
                        placeholderTextColor={Colors.grayColor}
                        value={phoneNumber}
                        onChangeText={(newVal) => setphoneNumber(newVal)}
                        cursorColor={Colors.primaryColor}
                        selectionColor={Colors.primaryColor}
                        style={styles.textFieldStyle}
                        keyboardType="phone-pad"
                        numberOfLines={1}
                    />
                </View>
            </View>
        )
    }
}

export default LoginScreen

const styles = StyleSheet.create({
    heroWrap: {
        width: '100%',
        height: Screen.height * 0.45,
        backgroundColor: Colors.offWhiteColor,
    },
    heroImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    card: {
        marginTop: -Sizes.fixPadding * 3.5,
        marginHorizontal: Sizes.fixPadding * 2.0,
        backgroundColor: Colors.whiteColor,
        borderRadius: Sizes.fixPadding * 2.5,
        paddingHorizontal: Sizes.fixPadding * 2.2,
        paddingTop: Sizes.fixPadding * 2.4,
        paddingBottom: Sizes.fixPadding * 3.0,
        shadowColor: Colors.blackColor,
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 18,
        elevation: 4,
    },
    titleText: {
        ...Fonts.blackColor20SemiBold,
        textAlign: 'center',
    },
    subtitleText: {
        ...Fonts.grayColor15Regular,
        textAlign: 'center',
        marginTop: Sizes.fixPadding - 6.0,
    },
    inputLabel: {
        ...Fonts.grayColor15Regular,
        marginBottom: Sizes.fixPadding - 6.0,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomColor: Colors.blackColor,
        borderBottomWidth: 1.0,
        paddingBottom: Sizes.fixPadding - 2.0,
    },
    textFieldStyle: {
        ...Fonts.blackColor17Regular,
        flex: 1,
        marginLeft: Sizes.fixPadding,
        paddingVertical: 0,
    },
    errorText: {
        marginTop: Sizes.fixPadding,
        textAlign: 'center',
        ...Fonts.grayColor15Regular,
        color: Colors.redColor,
    },
    primaryButton: {
        marginTop: Sizes.fixPadding * 2.2,
        backgroundColor: Colors.primaryColor,
        borderRadius: 999,
        paddingVertical: Sizes.fixPadding + 4.0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        ...Fonts.whiteColor19Medium,
        letterSpacing: 1.0,
    },
    orRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Sizes.fixPadding * 2.0,
        marginBottom: Sizes.fixPadding * 1.6,
    },
    orLine: {
        flex: 1,
        height: 1.0,
        backgroundColor: Colors.lightGrayColor,
    },
    orText: {
        ...Fonts.grayColor15Regular,
        marginHorizontal: Sizes.fixPadding,
    },
    outlineButton: {
        borderColor: Colors.lightGrayColor,
        borderWidth: 1.0,
        borderRadius: 999,
        paddingVertical: Sizes.fixPadding + 4.0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    outlineButtonText: {
        ...Fonts.blackColor16Medium,
        letterSpacing: 1.0,
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
