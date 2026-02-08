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

    const formatAddressType = (type) => {
        if (!type) return 'Address';
        const normalized = String(type).trim();
        return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Address';
    };

    const formatAddress = (address) => {
        if (!address) return '';
        const parts = [
            address.addressLine1 || address.completeAddress || address.address || '',
            address.addressLine2 || '',
            address.city || '',
            address.state || '',
            address.pincode || '',
        ].filter(Boolean);
        return parts.join(', ');
    };

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
            const indexed = addressList.map((addr, index) => ({ ...addr, _index: index }));
            setAddresses(indexed);

            // Auto-select first address or default address
            if (indexed.length > 0) {
                const defaultAddr = indexed.find(a => a.isDefault);
                const fallback = indexed[0];
                setSelectedAddressId(defaultAddr?.id ?? defaultAddr?._index ?? fallback.id ?? fallback._index);
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
        if (selectedAddressId == null) return;

        const selectedAddress = addresses.find(a => (a.id ?? a._index) === selectedAddressId);
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
                disabled={selectedAddressId == null}
                style={[CommomStyles.buttonStyle, selectedAddressId == null && { backgroundColor: Colors.lightGrayColor }]}
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
        const renderItem = ({ item, index }) => (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { setSelectedAddressId(item.id ?? item._index ?? index) }}
                style={{
                    ...styles.addressWrapStyle,
                    borderColor: selectedAddressId === (item.id ?? item._index ?? index) ? Colors.blackColor : Colors.offWhiteColor,
                }}
            >
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ ...Fonts.blackColor18Medium }}>{formatAddressType(item.addressType)}</Text>
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
                        {formatAddress(item)}
                    </Text>
                    <View style={styles.addressActionsRow}>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                                navigation.push('addNewAddress/addNewAddressScreen', {
                                    mode: 'edit',
                                    addressIndex: item._index ?? index,
                                    address: JSON.stringify(item),
                                });
                            }}
                            style={styles.addressActionButton}
                        >
                            <Text style={styles.addressActionText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={async () => {
                                try {
                                    const manageAddress = httpsCallable(functions, 'manageAddress');
                                    await manageAddress({
                                        action: 'setDefault',
                                        addressIndex: item._index ?? index,
                                    });
                                    fetchAddresses();
                                } catch (err) {
                                    console.log('Error setting default address:', err);
                                }
                            }}
                            style={styles.addressActionButton}
                        >
                            <Text style={styles.addressActionText}>Set Default</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={async () => {
                                try {
                                    const manageAddress = httpsCallable(functions, 'manageAddress');
                                    await manageAddress({
                                        action: 'delete',
                                        addressIndex: item._index ?? index,
                                    });
                                    fetchAddresses();
                                } catch (err) {
                                    console.log('Error deleting address:', err);
                                }
                            }}
                            style={styles.addressActionButton}
                        >
                            <Text style={styles.addressActionText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        )
        return (
            <FlatList
                data={addresses}
                keyExtractor={(item, index) => `${item.id ?? item._index ?? index}`}
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
    addressActionsRow: {
        flexDirection: 'row',
        marginTop: Sizes.fixPadding,
    },
    addressActionButton: {
        borderWidth: 1.0,
        borderColor: Colors.blackColor,
        borderRadius: Sizes.fixPadding - 2.0,
        paddingHorizontal: Sizes.fixPadding + 5.0,
        paddingVertical: Sizes.fixPadding - 6.0,
        marginRight: Sizes.fixPadding,
    },
    addressActionText: {
        ...Fonts.blackColor14Medium,
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
})
