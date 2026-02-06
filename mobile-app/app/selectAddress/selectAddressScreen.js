import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native'
import React, { useState, useEffect, useCallback } from 'react'
import { Colors, Fonts, Sizes, CommomStyles } from '../../constants/styles'
import { MaterialIcons, Feather } from '@expo/vector-icons';
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation, useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';

const SelectAddressScreen = () => {

    const navigation = useNavigation();
    const router = useRouter();
    const params = useLocalSearchParams();
    const deliveryMethod = params.deliveryMethod || 'home_delivery';
    const cartTotal = Number(params.cartTotal) || 0;

    const [addresses, setAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            fetchAddresses();
        }, [])
    );

    const fetchAddresses = async () => {
        try {
            const getAddresses = httpsCallable(functions, 'getAddresses');
            const res = await getAddresses();
            const addressList = res?.data?.addresses || [];
            setAddresses(addressList);

            // Auto-select first address or default address
            if (addressList.length > 0) {
                const defaultAddr = addressList.find(a => a.isDefault);
                setSelectedAddressId(defaultAddr?.id || addressList[0].id);
            }
        } catch (err) {
            console.log('Error fetching addresses:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchAddresses();
    };

    const handleNext = () => {
        if (!selectedAddressId) return;

        const selectedAddress = addresses.find(a => a.id === selectedAddressId);
        if (!selectedAddress) return;

        navigation.push('checkout/orderSummaryScreen', {
            deliveryMethod: 'home_delivery',
            selectedAddress: JSON.stringify(selectedAddress),
            cartTotal,
        });
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: Colors.whiteColor, alignItems: 'center', justifyContent: 'center' }}>
                <MyStatusBar />
                <ActivityIndicator color={Colors.primaryColor} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {header()}
                {addresses.length === 0 ? (
                    noAddressesInfo()
                ) : (
                    addressesInfo()
                )}
            </View>
            {addresses.length > 0 && nextButton()}
        </View>
    )

    function noAddressesInfo() {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Sizes.fixPadding * 2.0 }}>
                <MaterialIcons name="location-off" size={60} color={Colors.lightGrayColor} />
                <Text style={{ ...Fonts.blackColor18SemiBold, marginTop: Sizes.fixPadding * 2.0, textAlign: 'center' }}>
                    No Addresses Found
                </Text>
                <Text style={{ ...Fonts.grayColor15Regular, marginTop: Sizes.fixPadding - 5, textAlign: 'center' }}>
                    Add a delivery address to continue
                </Text>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => navigation.push('addNewAddress/addNewAddressScreen')}
                    style={[CommomStyles.buttonStyle, { marginTop: Sizes.fixPadding * 2.5, marginHorizontal: Sizes.fixPadding * 4 }]}
                >
                    <Text style={{ ...Fonts.whiteColor19Medium }}>
                        Add Address
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    function nextButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleNext}
                disabled={!selectedAddressId}
                style={[CommomStyles.buttonStyle, !selectedAddressId && { backgroundColor: Colors.lightGrayColor }]}
            >
                <Text style={{ ...Fonts.whiteColor19Medium }}>
                    Continue to Payment
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
                onPress={() => { setSelectedAddressId(item.id) }}
                style={{
                    ...styles.addressWrapStyle,
                    borderColor: selectedAddressId === item.id ? Colors.blackColor : Colors.offWhiteColor,
                }}
            >
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ ...Fonts.blackColor18Medium }}>{item.addressType || 'Address'}</Text>
                        {item.isDefault && (
                            <View style={styles.defaultBadge}>
                                <Text style={{ ...Fonts.whiteColor12Medium }}>Default</Text>
                            </View>
                        )}
                    </View>
                    <Text numberOfLines={1} style={{ lineHeight: 23.0, ...Fonts.grayColor15Regular }}>
                        {item.name} | {item.phone || item.mobileNo}
                    </Text>
                    <Text style={{ lineHeight: 23.0, ...Fonts.grayColor15Regular }}>
                        {item.addressLine1}{item.addressLine2 ? `, ${item.addressLine2}` : ''}
                    </Text>
                    <Text style={{ ...Fonts.grayColor15Regular }}>
                        {item.city}, {item.state} - {item.pincode}
                    </Text>
                </View>
                <View style={[styles.radioOuter, selectedAddressId === item.id && styles.radioOuterSelected]}>
                    {selectedAddressId === item.id && <View style={styles.radioInner} />}
                </View>
            </TouchableOpacity>
        )
        return (
            <FlatList
                data={addresses}
                keyExtractor={(item) => `${item.id}`}
                renderItem={renderItem}
                contentContainerStyle={{ paddingTop: Sizes.fixPadding * 2.0, paddingBottom: Sizes.fixPadding * 2.0 }}
                ListFooterComponent={addAddressInfo()}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[Colors.primaryColor]}
                    />
                }
            />
        )
    }

    function header() {
        return (
            <View style={CommomStyles.headerStyle}>
                <MaterialIcons name="keyboard-backspace" size={26} color={Colors.blackColor} onPress={() => { navigation.pop() }} />
                <TouchableOpacity onPress={() => router.replace('/(tabs)/home/homeScreen')} activeOpacity={0.7} style={{ flex: 1, alignItems: 'center' }}>
                    <Image source={require('../../assets/images/dp-logo-02.png')} style={CommomStyles.headerLogo} />
                </TouchableOpacity>
                <View style={{ width: 26 }} />
            </View>
        )
    }
}

export default SelectAddressScreen

const styles = StyleSheet.create({
    addressWrapStyle: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderWidth: 1.5,
        borderRadius: Sizes.fixPadding,
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginBottom: Sizes.fixPadding * 2.0,
        paddingHorizontal: Sizes.fixPadding + 5.0,
        paddingVertical: Sizes.fixPadding,
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
    },
    defaultBadge: {
        backgroundColor: Colors.primaryColor,
        paddingHorizontal: Sizes.fixPadding,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: Sizes.fixPadding,
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: Colors.lightGrayColor,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: Sizes.fixPadding,
    },
    radioOuterSelected: {
        borderColor: Colors.blackColor,
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.blackColor,
    },
})
