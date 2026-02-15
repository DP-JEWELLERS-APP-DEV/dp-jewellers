import { Text, View, ScrollView, Image } from 'react-native'
import React from 'react'
import { Colors, Fonts, Sizes, CommomStyles } from '../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons'
import MyStatusBar from '../../components/myStatusBar'
import { useNavigation } from 'expo-router'

const sections = [
    {
        title: 'Overview',
        items: [
            'Your privacy matters to us. This Privacy Policy explains how DP Jewellers collects, uses, and protects your information when you use the app.'
        ]
    },
    {
        title: 'Information We Collect',
        items: [
            'Account information such as your name, phone number, and profile details.',
            'Order and transaction information, including items purchased and delivery address.',
            'Device and usage data such as app activity, device type, and diagnostics to improve performance.'
        ]
    },
    {
        title: 'How We Use Your Information',
        items: [
            'To create and manage your account, process orders, and provide customer support.',
            'To personalize your experience and improve our products and services.',
            'To send service updates related to your orders or account.'
        ]
    },
    {
        title: 'Sharing of Information',
        items: [
            'We may share information with trusted service providers (such as payment and delivery partners) to fulfill your orders.',
            'We do not sell your personal information to third parties.'
        ]
    },
    {
        title: 'Data Security',
        items: [
            'We use reasonable technical and organizational measures to protect your data from unauthorized access, loss, or misuse.',
            'No system is completely secure. Please keep your account credentials private.'
        ]
    },
    {
        title: 'Your Choices',
        items: [
            'You can update your profile information from the My Account section.',
            'You may contact us to request access, correction, or deletion of your personal data where applicable.'
        ]
    },
    {
        title: 'Children\'s Privacy',
        items: [
            'The app is not intended for children under 13. We do not knowingly collect personal information from children.'
        ]
    },
    {
        title: 'Contact',
        items: [
            'For questions about this Privacy Policy, please reach out via the Contact Us section in the app.'
        ]
    }
]

const PrivacyPolicyScreen = () => {

    const navigation = useNavigation()

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {header()}
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Sizes.fixPadding * 2.0 }}>
                  
                    <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginTop: Sizes.fixPadding }}>
                        <Text style={{ ...Fonts.blackColor18SemiBold, fontSize: 22 }}>Privacy Policy</Text>
                    </View>
                    {sections.map((section) => renderSection(section))}
                </ScrollView>
            </View>
        </View>
    )

    function renderSection(section) {
        return (
            <View key={section.title} style={{ margin: Sizes.fixPadding * 2.0, marginBottom: Sizes.fixPadding }}>
                <Text style={{ ...Fonts.blackColor16Medium, marginBottom: Sizes.fixPadding }}>
                    {section.title}
                </Text>
                {section.items.map((item, index) => (
                    <Text key={`${section.title}-${index}`} style={{ lineHeight: 23.0, ...Fonts.grayColor15Regular, marginBottom: Sizes.fixPadding - 2.0 }}>
                        {item}
                    </Text>
                ))}
            </View>
        )
    }

    function header() {
        return (
            <View style={CommomStyles.headerStyle}>
                <MaterialIcons name="keyboard-backspace" size={26} color={Colors.blackColor} onPress={() => { navigation.pop() }} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Image source={require('../../assets/images/dp-logo-02.png')} style={CommomStyles.headerLogo} />
                </View>
                <View style={{ width: 26 }} />
            </View>
        )
    }
}

export default PrivacyPolicyScreen
