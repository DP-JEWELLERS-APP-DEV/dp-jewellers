import { StyleSheet, Text, View, Image, FlatList, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { Colors, Fonts, Sizes, CommomStyles } from '../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons';
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation } from 'expo-router';

const paymentMethodsList = [
    {
        id: '1',
        icon: require('../../assets/images/paymentIcons/creditCard.png'),
        paymentMethod: 'Credit Card',
    },
    {
        id: '2',
        icon: require('../../assets/images/paymentIcons/paypal.png'),
        paymentMethod: 'PayPal',
    },
    {
        id: '3',
        icon: require('../../assets/images/paymentIcons/stripe.png'),
        paymentMethod: 'Stripe',
    },
    {
        id: '4',
        icon: require('../../assets/images/paymentIcons/googlePay.png'),
        paymentMethod: 'Google Pay',
    },
    {
        id: '5',
        icon: require('../../assets/images/paymentIcons/cashOnDelivery.png'),
        paymentMethod: 'Cash on Delivery',
    },
];

const SelectPaymentMethodScreen = () => {

    const navigation = useNavigation();

    const [selectedPaymentMethodId, setselectedPaymentMethodId] = useState(paymentMethodsList[paymentMethodsList.length - 1].id)

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {header()}
                {paymentMethods()}
            </View>
            {confirmButton()}
        </View>
    )

    function confirmButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { navigation.push('orderSuccessfull/orderSuccessfullScreen') }}
                style={{ ...CommomStyles.buttonStyle }}
            >
                <Text style={{ ...Fonts.whiteColor19Medium }}>
                    Confirm
                </Text>
            </TouchableOpacity>
        )
    }

    function header() {
        return (
            <View style={CommomStyles.headerStyle}>
                <Image source={require('../../assets/images/dp-logo-01.png')} style={CommomStyles.headerLogo} />
                <MaterialIcons name="keyboard-backspace" size={26} color={Colors.blackColor} onPress={() => { navigation.pop() }} />
                <Text numberOfLines={1} style={{ ...Fonts.blackColor20SemiBold, marginLeft: Sizes.fixPadding * 2.0, }}>
                    Select Payment Method
                </Text>
            </View>
        )
    }

    function paymentMethods() {
        const renderItem = ({ item }) => (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { setselectedPaymentMethodId(item.id) }}
                style={{
                    borderColor: selectedPaymentMethodId == item.id ? Colors.blackColor : Colors.offWhiteColor,
                    ...styles.paymentMethodWrapStyle,
                }}
            >
                <Image
                    source={item.icon}
                    style={{ width: 28.0, height: 28.0, resizeMode: 'contain' }}
                />
                <Text style={{ ...Fonts.blackColor16SemiBold, marginLeft: Sizes.fixPadding + 4.0 }}>
                    {item.paymentMethod}
                </Text>
            </TouchableOpacity>
        )
        return (
            <FlatList
                data={paymentMethodsList}
                keyExtractor={(item) => `${item.id}`}
                renderItem={renderItem}
                contentContainerStyle={{ paddingTop: Sizes.fixPadding * 2.0 }}
            />
        )
    }
}

export default SelectPaymentMethodScreen

const styles = StyleSheet.create({
    paymentMethodWrapStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: Sizes.fixPadding,
        borderWidth: 1.0,
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginBottom: Sizes.fixPadding * 2.0,
        padding: Sizes.fixPadding + 5.0
    }
})
