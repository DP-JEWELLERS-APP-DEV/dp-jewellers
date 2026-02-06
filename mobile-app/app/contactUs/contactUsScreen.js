import { StyleSheet, Text, View, ScrollView, Image, TextInput, TouchableOpacity, SafeAreaView, StatusBar, ActivityIndicator, Alert } from 'react-native'
import React, { useState, useEffect } from 'react'
import { Colors, CommomStyles, Fonts, Screen, Sizes } from '../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../../lib/firebase';

const ContactUsScreen = () => {

    const navigation = useNavigation();
    const router = useRouter();

    const [fullName, setfullName] = useState('');
    const [email, setemail] = useState('');
    const [message, setmessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        // Pre-fill user data if logged in
        if (auth?.currentUser) {
            fetchProfile();
        }
    }, []);

    const fetchProfile = async () => {
        try {
            const getUserProfile = httpsCallable(functions, 'getUserProfile');
            const result = await getUserProfile();
            const data = result.data;
            setfullName(data?.name || '');
            setemail(data?.email || '');
        } catch (err) {
            // Ignore error, user can fill manually
        }
    };

    const handleSubmit = async () => {
        if (!fullName.trim()) {
            Alert.alert('Error', 'Please enter your name');
            return;
        }
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email address');
            return;
        }
        if (!message.trim()) {
            Alert.alert('Error', 'Please enter your message');
            return;
        }

        setSubmitting(true);
        try {
            const submitContactForm = httpsCallable(functions, 'submitContactForm');
            await submitContactForm({
                name: fullName.trim(),
                email: email.trim(),
                message: message.trim(),
            });
            Alert.alert('Success', 'Your message has been sent. We will get back to you soon.', [
                { text: 'OK', onPress: () => navigation.pop() }
            ]);
        } catch (err) {
            console.log('Error submitting contact form:', err);
            Alert.alert('Error', 'Failed to send message. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <SafeAreaView style={{ backgroundColor: Colors.blackColor }}>
                <StatusBar
                    translucent={false}
                    backgroundColor={Colors.blackColor}
                    barStyle={"light-content"}
                />
            </SafeAreaView>
            <View style={{ flex: 1 }}>
                {backArrow()}
                <ScrollView bounces={false} automaticallyAdjustKeyboardInsets={true} showsVerticalScrollIndicator={false}>
                    {titleWithIcon()}
                    {contactInfo()}
                    {sendButton()}
                </ScrollView>
            </View>
        </View>
    )

    function backArrow() {
        return (
            <View style={{ backgroundColor: Colors.blackColor, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Sizes.fixPadding * 2.0, paddingTop: Sizes.fixPadding * 2.0, paddingBottom: Sizes.fixPadding }}>
                <MaterialIcons
                    name="keyboard-backspace"
                    size={26}
                    color={Colors.whiteColor}
                    onPress={() => { navigation.pop() }}
                />
                <TouchableOpacity onPress={() => router.replace('/(tabs)/home/homeScreen')} activeOpacity={0.7}>
                    <Image source={require('../../assets/images/dp-logo-02.png')} style={[CommomStyles.headerLogo, { tintColor: Colors.whiteColor }]} />
                </TouchableOpacity>
                <View style={{ width: 26 }} />
            </View>
        )
    }

    function sendButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleSubmit}
                disabled={submitting}
                style={[CommomStyles.buttonStyle, submitting && { backgroundColor: Colors.lightGrayColor }]}
            >
                {submitting ? (
                    <ActivityIndicator color={Colors.whiteColor} />
                ) : (
                    <Text style={{ ...Fonts.whiteColor19Medium }}>
                        Submit
                    </Text>
                )}
            </TouchableOpacity>
        )
    }

    function contactInfo() {
        return (
            <View style={styles.contactInfoWrapStyle}>
                {fullNameInfo()}
                {emailInfo()}
                {messageInfo()}
            </View>
        )
    }

    function messageInfo() {
        return (
            <View style={{ marginBottom: Sizes.fixPadding * 1.8 }}>
                <Text style={{ ...Fonts.grayColor15Regular }}>
                    Message *
                </Text>
                <TextInput
                    placeholder='Write here....'
                    placeholderTextColor={Colors.grayColor}
                    value={message}
                    onChangeText={(newVal) => setmessage(newVal)}
                    cursorColor={Colors.primaryColor}
                    selectionColor={Colors.primaryColor}
                    style={[styles.textFieldStyle, { minHeight: 100, textAlignVertical: 'top' }]}
                    multiline
                    numberOfLines={4}
                />
            </View>
        )
    }

    function emailInfo() {
        return (
            <View style={{ marginVertical: Sizes.fixPadding * 2.8 }}>
                <Text style={{ ...Fonts.grayColor15Regular }}>
                    Email Address *
                </Text>
                <TextInput
                    placeholder='Email Address'
                    placeholderTextColor={Colors.grayColor}
                    value={email}
                    onChangeText={(newVal) => setemail(newVal)}
                    cursorColor={Colors.primaryColor}
                    selectionColor={Colors.primaryColor}
                    style={styles.textFieldStyle}
                    keyboardType="email-address"
                    numberOfLines={1}
                />
            </View>
        )
    }

    function fullNameInfo() {
        return (
            <View style={{}}>
                <Text style={{ ...Fonts.grayColor15Regular }}>
                    Full Name *
                </Text>
                <TextInput
                    placeholder='Full Name'
                    placeholderTextColor={Colors.grayColor}
                    value={fullName}
                    onChangeText={(newVal) => setfullName(newVal)}
                    cursorColor={Colors.primaryColor}
                    selectionColor={Colors.primaryColor}
                    style={styles.textFieldStyle}
                    numberOfLines={1}
                />
            </View>
        )
    }

    function titleWithIcon() {
        return (
            <View style={styles.titleWithIconWrapStyle}>
                <Text style={{ ...Fonts.whiteColor24ExtraBold }}>
                    GET IN TOUCH !
                </Text>
                <Text style={{ ...Fonts.whiteColor17Regular, }}>
                    Always within your reach
                </Text>
                <Image
                    source={require('../../assets/images/contact.png')}
                    style={styles.contactIconStyle}
                />
            </View>
        )
    }
}

export default ContactUsScreen

const styles = StyleSheet.create({
    backArrowWrapper: {
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginTop: Sizes.fixPadding * 2.0,
        marginBottom: Sizes.fixPadding,
        alignSelf: 'flex-start',
    },
    titleWithIconWrapStyle: {
        alignItems: 'center',
        paddingBottom: Sizes.fixPadding * 4.0,
        paddingHorizontal: Sizes.fixPadding * 4.0,
        backgroundColor: Colors.blackColor
    },
    infoWrapStyle: {
        ...Fonts.blackColor16Regular,
        backgroundColor: Colors.bgColor,
        borderRadius: Sizes.fixPadding,
        padding: Sizes.fixPadding + 2.0,
        marginTop: Sizes.fixPadding - 2.0
    },
    contactInfoWrapStyle: {
        paddingHorizontal: Sizes.fixPadding * 2.0,
        paddingTop: Sizes.fixPadding * 3.0,
        paddingBottom: Sizes.fixPadding * 2.0,
        flex: 1,
        backgroundColor: Colors.whiteColor,
    },
    contactIconStyle: {
        width: Screen.width / 2.8,
        height: Screen.width / 2.8,
        resizeMode: 'contain',
        marginTop: Sizes.fixPadding * 3.5
    },
    textFieldStyle: {
        ...Fonts.blackColor17Regular,
        borderBottomColor: Colors.blackColor,
        borderBottomWidth: 1.0,
        padding: 0,
        paddingBottom: Sizes.fixPadding
    }
})
