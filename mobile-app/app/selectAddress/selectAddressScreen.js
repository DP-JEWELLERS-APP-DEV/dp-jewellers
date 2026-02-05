import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image } from 'react-native'
import React, { useState } from 'react'
import { Colors, Fonts, Sizes, CommomStyles } from '../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons';
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation } from 'expo-router';

const addressList = [
    {
        id: '1',
        addressType: 'Home',
        name: 'Samantha Smith',
        mobileNo: '+79 147 896 562',
        address: 'Kocherstr. 6, Zimmer 773, 25682, Nord Tino, Sachsen-Anhalt, Germany',
    },
    {
        id: '2',
        addressType: 'Office',
        name: 'Samantha Smith',
        mobileNo: '+79 147 896 562',
        address: 'Kocherstr. 6, Zimmer 773, 25682, Nord Tino, Sachsen-Anhalt, Germany',
    },
];

const SelectAddressScreen = () => {

    const navigation = useNavigation();

    const [selectedAddressId, setselectedAddressId] = useState(addressList[0].id);

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {header()}
                {addressesInfo()}
            </View>
            {nextButton()}
        </View>
    )

    function nextButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { navigation.push('selectPaymentMethod/selectPaymentMethodScreen') }}
                style={{ ...CommomStyles.buttonStyle }}
            >
                <Text style={{ ...Fonts.whiteColor19Medium }}>
                    Next
                </Text>
            </TouchableOpacity>
        )
    }

    function addAddressInfo() {
        return (
            <TouchableOpacity
                activeOpacity={0.5}
                onPress={() => { navigation.push('addNewAddress/addNewAddressScreen') }}
                style={styles.addAddressWrapStyle}
            >
                <MaterialIcons name="add" size={22} color={Colors.lightGrayColor} />
                <Text style={{ ...Fonts.lightGrayColor16Regular, marginTop: Sizes.fixPadding - 5.0 }}>
                    Add New Address
                </Text>
            </TouchableOpacity>
        )
    }

    function addressesInfo() {
        const renderItem = ({ item }) => (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { setselectedAddressId(item.id) }}
                style={{
                    ...styles.addressWrapStyle,
                    borderColor: selectedAddressId == item.id ? Colors.blackColor : Colors.offWhiteColor,
                }}
            >
                <Text style={{ ...Fonts.blackColor18Medium }}>
                    {item.addressType}
                </Text>
                <Text numberOfLines={1} style={{ lineHeight: 23.0, ...Fonts.grayColor15Regular }}>
                    {item.name} | {item.mobileNo}
                </Text>
                <Text style={{ lineHeight: 23.0, ...Fonts.grayColor15Regular }}>
                    {item.address}
                </Text>
            </TouchableOpacity>
        )
        return (
            <FlatList
                data={addressList}
                keyExtractor={(item) => `${item.id}`}
                renderItem={renderItem}
                contentContainerStyle={{ paddingTop: Sizes.fixPadding * 2.0, }}
                ListFooterComponent={addAddressInfo()}
            />
        )
    }

    function header() {
        return (
            <View style={CommomStyles.headerStyle}>
                <Image source={require('../../assets/images/dp-logo-01.png')} style={CommomStyles.headerLogo} />
                <MaterialIcons name="keyboard-backspace" size={26} color={Colors.blackColor} onPress={() => { navigation.pop() }} />
                <Text numberOfLines={1} style={{ ...Fonts.blackColor20SemiBold, marginLeft: Sizes.fixPadding * 2.0, }}>
                    Select Shipping Address
                </Text>
            </View>
        )
    }
}

export default SelectAddressScreen

const styles = StyleSheet.create({
    addressWrapStyle: {
        borderWidth: 1.0,
        borderRadius: Sizes.fixPadding,
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginBottom: Sizes.fixPadding * 2.0,
        paddingHorizontal: Sizes.fixPadding,
        paddingVertical: Sizes.fixPadding - 5.0,
    },
    addAddressWrapStyle: {
        borderColor: Colors.lightGrayColor,
        borderWidth: 1.0,
        borderStyle: 'dashed',
        marginHorizontal: Sizes.fixPadding * 6.0,
        padding: Sizes.fixPadding * 2.5,
        alignItems: 'center',
        borderRadius: Sizes.fixPadding,
        marginBottom: Sizes.fixPadding * 2.0,
    }
})
