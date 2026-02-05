import { Text, View, ScrollView, Image } from 'react-native'
import React from 'react'
import { Colors, Fonts, Sizes, CommomStyles } from '../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons'
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation } from 'expo-router';

const termsOfUse = [
    'Lorem ipsum dolor sit amet, consectetur adipiscin elit. Tempor sagittis accumsan at pellentesque faucibus.',
    'Elit cras fermentum non fermentum dignissim. Maususpendisse non elit sed morbi a. Nam in pellenteslectus nibh maecenas placerat sem. Lectus sit nibegestas aliquet id consectetur scelerisque consectetur integer.'
];

const companyPolicies = [
    'Lorem ipsum dolor sit amet, consectetur adipiscin elit. Tempor sagittis accumsan at pellentesque faucibus.',
    'Elit cras fermentum non fermentum dignissim. Maususpendisse non elit sed morbi a. Nam in pellenteslectus nibh maecenas placerat sem. Lectus sit nibegestas aliquet id consectetur scelerisque consectetur integer.'
];

const TermsAndConditionScreen = () => {

    const navigation = useNavigation();

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1, }}>
                {header()}
                <ScrollView showsVerticalScrollIndicator={false}>
                    {termsOfUseInfo()}
                    {companyPolicyInfo()}
                </ScrollView>
            </View>
        </View>
    )

    function companyPolicyInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, }}>
                <Text style={{ ...Fonts.blackColor16Medium, marginBottom: Sizes.fixPadding }}>
                    Company Policy
                </Text>
                {
                    companyPolicies.map((item, index) => (
                        <Text key={`${index}`} style={{ lineHeight: 23.0, ...Fonts.grayColor15Regular, marginBottom: Sizes.fixPadding - 2.0 }}>
                            {item}
                        </Text>
                    ))
                }
            </View>
        )
    }

    function termsOfUseInfo() {
        return (
            <View style={{ margin: Sizes.fixPadding * 2.0, }}>
                <Text style={{ ...Fonts.blackColor16Medium, marginBottom: Sizes.fixPadding }}>
                    Terms of Use
                </Text>
                {
                    termsOfUse.map((item, index) => (
                        <Text key={`${index}`} style={{ lineHeight: 23.0, ...Fonts.grayColor15Regular, marginBottom: Sizes.fixPadding - 2.0 }}>
                            {item}
                        </Text>
                    ))
                }
            </View>
        )
    }

    function header() {
        return (
            <View style={CommomStyles.headerStyle}>
                <Image source={require('../../assets/images/dp-logo-01.png')} style={CommomStyles.headerLogo} />
                <MaterialIcons name="keyboard-backspace" size={26} color={Colors.blackColor} onPress={() => { navigation.pop() }} />
                <Text numberOfLines={1} style={{ ...Fonts.blackColor20SemiBold, marginLeft: Sizes.fixPadding * 2.0, }}>
                    Terms & Conditions
                </Text>
            </View>
        )
    }
}

export default TermsAndConditionScreen
