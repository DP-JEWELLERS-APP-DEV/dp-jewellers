import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, DeviceEventEmitter } from 'react-native'
import React, { useState, useCallback, useEffect } from 'react'
import { Colors, Fonts, Sizes, CommomStyles } from '../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons';
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation, useRouter, useFocusEffect } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';

const ShippingAddressesScreen = () => {

    const navigation = useNavigation();
    const router = useRouter();

    const [addresses, setAddresses] = useState([]);
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

    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener('addressesUpdated', () => {
            fetchAddresses();
        });
        return () => subscription.remove();
    }, []);

    const fetchAddresses = async () => {
        try {
            const getAddresses = httpsCallable(functions, 'getAddresses');
            const res = await getAddresses();
            setAddresses(res?.data?.addresses || []);
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
                    Add an address to continue
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
            <View style={styles.addressWrapStyle}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ ...Fonts.blackColor18Medium, flex: 1 }}>
                        {formatAddressType(item.addressType)}
                    </Text>
                    {item.isDefault && (
                        <View style={styles.defaultBadge}>
                            <Text style={{ ...Fonts.whiteColor15Regular, fontSize: 11 }}>Default</Text>
                        </View>
                    )}
                </View>
                <Text numberOfLines={1} style={{ lineHeight: 23.0, ...Fonts.grayColor15Regular }}>
                    {item.name} | {item.phone || item.contactNumber}
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
                                addressIndex: index,
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
                                    action: 'delete',
                                    addressIndex: index,
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
        )
        return (
            <FlatList
                data={addresses}
                keyExtractor={(item, index) => `${index}`}
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
            <View style={styles.headerStyle}>
                <MaterialIcons name="keyboard-backspace" size={26} color={Colors.blackColor} onPress={() => { navigation.pop() }} />
                <TouchableOpacity onPress={() => router.replace('/(tabs)/home/homeScreen')} activeOpacity={0.7} style={{ flex: 1, alignItems: 'center' }}>
                    <Image source={require('../../assets/images/dp-logo-02.png')} style={CommomStyles.headerLogo} />
                </TouchableOpacity>
                <View style={{ width: 26 }} />
            </View>
        )
    }
}

export default ShippingAddressesScreen

const styles = StyleSheet.create({
    headerStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Sizes.fixPadding * 2.0,
        borderBottomColor: Colors.offWhiteColor,
        borderBottomWidth: 1.0,
    },
    addressWrapStyle: {
        borderColor: Colors.offWhiteColor,
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
    },
    defaultBadge: {
        backgroundColor: Colors.primaryColor,
        paddingHorizontal: Sizes.fixPadding,
        paddingVertical: 2,
        borderRadius: 4,
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
})
