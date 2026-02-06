import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native'
import React, { useState, useEffect, useCallback } from 'react'
import { Colors, Fonts, Sizes, CommomStyles } from '../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons';
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation, useRouter, useFocusEffect } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';

const OrdersScreen = () => {

    const navigation = useNavigation();
    const router = useRouter();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    useFocusEffect(
        useCallback(() => {
            fetchOrders();
        }, [])
    );

    const fetchOrders = async () => {
        try {
            setError('');
            const getUserOrders = httpsCallable(functions, 'getUserOrders');
            const res = await getUserOrders({});
            setOrders(res?.data?.orders || []);
        } catch (err) {
            console.log('Error fetching orders:', err);
            setError('Failed to load orders. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchOrders();
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = dateString.toDate ? dateString.toDate() : new Date(dateString);
            return date.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return '';
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'delivered':
                return Colors.greenColor;
            case 'cancelled':
                return Colors.redColor;
            case 'pending':
                return Colors.grayColor;
            case 'processing':
            case 'confirmed':
                return Colors.primaryColor;
            default:
                return Colors.blackColor;
        }
    };

    const getStatusLabel = (status) => {
        switch (status?.toLowerCase()) {
            case 'pending':
                return 'Pending';
            case 'confirmed':
                return 'Confirmed';
            case 'processing':
                return 'Processing';
            case 'ready_for_pickup':
                return 'Ready for Pickup';
            case 'out_for_delivery':
                return 'Out for Delivery';
            case 'delivered':
                return 'Delivered';
            case 'cancelled':
                return 'Cancelled';
            default:
                return status || 'Unknown';
        }
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
                {error ? (
                    <View style={styles.centerWrap}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity onPress={fetchOrders} style={styles.retryButton}>
                            <Text style={{ ...Fonts.primaryColor16Medium }}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : orders.length === 0 ? (
                    noOrdersInfo()
                ) : (
                    ordersInfo()
                )}
            </View>
        </View>
    )

    function noOrdersInfo() {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Sizes.fixPadding * 2.0 }}>
                <MaterialIcons name="shopping-bag" size={60} color={Colors.lightGrayColor} />
                <Text style={{ ...Fonts.blackColor18SemiBold, marginTop: Sizes.fixPadding * 2.0, textAlign: 'center' }}>
                    No Orders Yet
                </Text>
                <Text style={{ ...Fonts.grayColor15Regular, marginTop: Sizes.fixPadding - 5, textAlign: 'center' }}>
                    Start shopping to see your orders here
                </Text>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.replace('/(tabs)/home/homeScreen')}
                    style={[CommomStyles.buttonStyle, { marginTop: Sizes.fixPadding * 2.5, marginHorizontal: Sizes.fixPadding * 4 }]}
                >
                    <Text style={{ ...Fonts.whiteColor19Medium }}>
                        Start Shopping
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    function ordersInfo() {
        const renderItem = ({ item }) => (
            <TouchableOpacity
                activeOpacity={0.5}
                onPress={() => {
                    navigation.push('orderDetail/orderDetailScreen', {
                        orderDocId: item.docId,
                        orderId: item.orderId,
                    })
                }}
                style={styles.orderInfoWrapStyle}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ ...Fonts.blackColor18SemiBold }}>
                        {item.orderId}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.orderStatus) + '20' }]}>
                        <Text style={{ ...Fonts.grayColor12Medium, color: getStatusColor(item.orderStatus) }}>
                            {getStatusLabel(item.orderStatus)}
                        </Text>
                    </View>
                </View>
                <Text style={{ ...Fonts.grayColor14Regular, marginTop: 4 }}>
                    {formatDate(item.orderedAt)}
                </Text>
                <View style={styles.dashedLineStyle} />
                <View style={{ flexDirection: 'row', marginBottom: Sizes.fixPadding - 7.0 }}>
                    <Text numberOfLines={1} style={{ ...Fonts.grayColor14Regular, flex: 1 }}>
                        Delivery Type
                    </Text>
                    <Text style={{ ...Fonts.blackColor14Medium }}>
                        {item.deliveryType === 'store_pickup' ? 'Store Pickup' : 'Home Delivery'}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', marginBottom: Sizes.fixPadding - 7.0 }}>
                    <Text numberOfLines={1} style={{ ...Fonts.grayColor14Regular, flex: 1 }}>
                        Items
                    </Text>
                    <Text style={{ ...Fonts.blackColor14Medium }}>
                        {item.items?.length || 0} {(item.items?.length || 0) === 1 ? 'Item' : 'Items'}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                    <Text numberOfLines={1} style={{ ...Fonts.grayColor14Regular, flex: 1 }}>
                        Total Amount
                    </Text>
                    <Text style={{ ...Fonts.primaryColor16Bold }}>
                        {`₹ ${(item.orderSummary?.totalAmount || 0).toLocaleString('en-IN')}`}
                    </Text>
                </View>
            </TouchableOpacity>
        )
        return (
            <FlatList
                data={orders}
                keyExtractor={(item) => `${item.docId || item.orderId}`}
                renderItem={renderItem}
                contentContainerStyle={{ paddingTop: Sizes.fixPadding * 2.0, paddingBottom: Sizes.fixPadding * 2.0 }}
                showsVerticalScrollIndicator={false}
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

export default OrdersScreen

const styles = StyleSheet.create({
    orderInfoWrapStyle: {
        borderColor: Colors.offWhiteColor,
        borderWidth: 1.0,
        borderRadius: Sizes.fixPadding,
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginBottom: Sizes.fixPadding * 2.0,
        padding: Sizes.fixPadding + 2.0
    },
    dashedLineStyle: {
        borderColor: Colors.offWhiteColor,
        borderWidth: 1.0,
        borderStyle: 'dashed',
        marginVertical: Sizes.fixPadding
    },
    statusBadge: {
        paddingHorizontal: Sizes.fixPadding,
        paddingVertical: 4,
        borderRadius: 4,
    },
    centerWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        ...Fonts.grayColor15Regular,
        color: Colors.redColor,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: Sizes.fixPadding,
        padding: Sizes.fixPadding,
    },
})
