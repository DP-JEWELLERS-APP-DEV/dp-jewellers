import { StyleSheet, Text, View, Image, TextInput, ScrollView, TouchableOpacity } from 'react-native'
import React, { useState, useRef } from 'react'
import { Colors, Fonts, Sizes, Screen } from "../../constants/styles";
import { Feather } from '@expo/vector-icons';
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation } from 'expo-router';
import FirebaseRecaptcha from '../../components/FirebaseRecaptcha';
import { firebaseConfig } from '../../lib/firebase';

const RegisterScreen = () => {

    const navigation = useNavigation();

    const [fullName, setfullName] = useState('');
    const [mobileNumber, setmobileNumber] = useState('+91');
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
        const normalized = normalizePhone(mobileNumber);
        if (!fullName.trim()) {
            seterrorText('Please enter your name.');
            return;
        }
        if (!normalized || normalized.length < 10) {
            seterrorText('Please enter a valid phone number.');
            return;
        }
        setloading(true);
        seterrorText('');
        try {
            const verificationId = await recaptchaVerifier.current.sendOtp(normalized);
            navigation.push('auth/verificationScreen', {
                verificationId,
                phoneNumber: normalized,
                fullName,
                mode: 'register',
            });
        } catch (err) {
            seterrorText('Failed to send OTP. Please try again.');
        } finally {
            setloading(false);
        }
    };

    function heroSection() {
        return (
            <View style={styles.heroWrap}>
                <Image
                    source={require('../../assets/images/jewellery/jewellary1.png')}
                    style={styles.heroImage}
                />
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => { navigation.pop() }}
                    style={styles.backButton}
                >
                    <Feather name="arrow-left" size={20} color={Colors.blackColor} />
                </TouchableOpacity>
            </View>
        )
    }

    function cardSection() {
        return (
            <View style={styles.card}>
                <Text style={styles.titleText}>Create Account</Text>
                <Text style={styles.subtitleText}>Enter your name and phone number</Text>
                {fullNameInfo()}
                {mobileNumberInfo()}
                {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
                {registerButton()}
                {orDivider()}
                {loginButton()}
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

    function registerButton() {
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

    function loginButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => { navigation.push('auth/loginScreen') }}
                style={styles.outlineButton}
            >
                <Text style={styles.outlineButtonText}>Log In</Text>
            </TouchableOpacity>
        )
    }

    function mobileNumberInfo() {
        return (
            <View style={{ marginTop: Sizes.fixPadding * 1.8 }}>
                <Text style={styles.inputLabel}>Phone</Text>
                <View style={styles.inputRow}>
                    <Feather name="phone" size={18} color={Colors.grayColor} />
                    <TextInput
                        placeholder='Enter phone number'
                        placeholderTextColor={Colors.grayColor}
                        value={mobileNumber}
                        onChangeText={(newVal) => setmobileNumber(newVal)}
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

    function fullNameInfo() {
        return (
            <View style={{ marginTop: Sizes.fixPadding * 2.0 }}>
                <Text style={styles.inputLabel}>Name</Text>
                <View style={styles.inputRow}>
                    <Feather name="user" size={18} color={Colors.grayColor} />
                    <TextInput
                        placeholder='Enter full name'
                        placeholderTextColor={Colors.grayColor}
                        value={fullName}
                        onChangeText={(newVal) => setfullName(newVal)}
                        cursorColor={Colors.primaryColor}
                        selectionColor={Colors.primaryColor}
                        style={styles.textFieldStyle}
                        numberOfLines={1}
                    />
                </View>
            </View>
        )
    }

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <ScrollView
                automaticallyAdjustKeyboardInsets={true}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Sizes.fixPadding * 2.0 }}
            >
                <FirebaseRecaptcha
                    ref={recaptchaVerifier}
                    firebaseConfig={firebaseConfig}
                    hideUI
                />
                {heroSection()}
                {cardSection()}
            </ScrollView>
        </View>
    )
}

export default RegisterScreen

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
    backButton: {
        position: 'absolute',
        top: Sizes.fixPadding * 2.0,
        left: Sizes.fixPadding * 2.0,
        width: 34.0,
        height: 34.0,
        borderRadius: 17.0,
        backgroundColor: Colors.whiteColor,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.blackColor,
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 3,
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
        marginTop: Sizes.fixPadding * 2.0,
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
})
