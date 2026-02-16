import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Colors, Fonts, Sizes, CommomStyles } from '../../constants/styles'
import { MaterialIcons, Feather } from '@expo/vector-icons';
import MyStatusBar from '../../components/myStatusBar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';

const OrderConfirmationScreen = () => {

    const router = useRouter();
    const params = useLocalSearchParams();

    const orderDocId = params.orderDocId || '';

    const [orderData, setOrderData] = useState(null);
    const [loading, setLoading] = useState(Boolean(orderDocId));
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        if (!orderDocId) {
            setLoading(false);
            return;
        }

        let isMounted = true;
        const fetchOrder = async () => {
            try {
                const getOrderDetails = httpsCallable(functions, 'getOrderDetails');
                const res = await getOrderDetails({ orderDocId });
                if (isMounted) {
                    setOrderData(res?.data || null);
                    setLoadError('');
                }
            } catch (err) {
                if (isMounted) {
                    setLoadError('Unable to load order details. Showing saved summary instead.');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchOrder();
        return () => { isMounted = false; };
    }, [orderDocId]);

    const orderId = orderData?.orderId || params.orderId || '';
    const deliveryMethod = orderData?.deliveryType || params.deliveryMethod || 'home_delivery';

    const totalAmount = Number(orderData?.orderSummary?.totalAmount ?? params.totalAmount ?? 0);
    const partialPayment = orderData?.partialPayment || null;
    const paidAmount = Number(
        partialPayment?.isPartialPayment
            ? partialPayment.amountPaid
            : (params.paidAmount ?? totalAmount)
    ) || 0;
    const remainingAmount = Number(
        partialPayment?.isPartialPayment
            ? partialPayment.amountRemaining
            : (params.remainingAmount ?? 0)
    ) || 0;

    const isPickup = deliveryMethod === 'store_pickup';

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
            <ScrollView contentContainerStyle={{ padding: Sizes.fixPadding * 2.0 }} showsVerticalScrollIndicator={false}>
                <View style={{ alignItems: 'center' }}>
                    {successIcon()}
                    {orderInfo()}
                </View>
                {loadError ? (
                    <View style={styles.warningCard}>
                        <MaterialIcons name="info-outline" size={18} color={Colors.primaryColor} />
                        <Text style={{ ...Fonts.grayColor14Regular, marginLeft: Sizes.fixPadding, flex: 1 }}>{loadError}</Text>
                    </View>
                ) : null}
                {deliveryInfo()}
                {itemsInfo()}
                {paymentInfo()}
                {isPickup && pickupNote()}
                {buttons()}
            </ScrollView>
        </View>
    )

    function formatAddress(address) {
        if (!address) return '';
        const parts = [
            address.addressLine1 || address.completeAddress || address.address || '',
            address.addressLine2 || '',
            address.city || '',
            address.state || '',
            address.pincode || '',
        ].filter(Boolean);
        return parts.join(', ');
    }

    function buttons() {
        return (
            <View style={{ width: '100%', marginTop: Sizes.fixPadding * 3.0 }}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push('orders/ordersScreen')}
                    style={CommomStyles.buttonStyle}
                >
                    <Text style={{ ...Fonts.whiteColor19Medium }}>
                        View Orders
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.replace('/(tabs)/home/homeScreen')}
                    style={[CommomStyles.buttonStyle, { backgroundColor: Colors.whiteColor, borderWidth: 1.5, borderColor: Colors.blackColor, marginTop: Sizes.fixPadding }]}
                >
                    <Text style={{ ...Fonts.blackColor19Medium }}>
                        Continue Shopping
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    function pickupNote() {
        return (
            <View style={styles.noteCard}>
                <MaterialIcons name="info-outline" size={20} color={Colors.primaryColor} />
                <Text style={{ ...Fonts.grayColor14Regular, flex: 1, marginLeft: Sizes.fixPadding }}>
                    Please bring your order ID and a valid ID proof when picking up your order from the store.
                </Text>
            </View>
        );
    }

    function paymentInfo() {
        return (
            <View style={styles.paymentCard}>
                <View style={styles.paymentRow}>
                    <Text style={{ ...Fonts.grayColor14Regular }}>Order Total</Text>
                    <Text style={{ ...Fonts.blackColor16Regular }}>{`₹ ${totalAmount.toLocaleString('en-IN')}`}</Text>
                </View>
                <View style={styles.paymentRow}>
                    <Text style={{ ...Fonts.grayColor14Regular }}>Amount Paid</Text>
                    <Text style={{ ...Fonts.blackColor16SemiBold, color: Colors.greenColor }}>{`₹ ${paidAmount.toLocaleString('en-IN')}`}</Text>
                </View>
                {remainingAmount > 0 && (
                    <View style={styles.paymentRow}>
                        <Text style={{ ...Fonts.grayColor14Regular }}>Due at Pickup</Text>
                        <Text style={{ ...Fonts.blackColor16Regular }}>{`₹ ${remainingAmount.toLocaleString('en-IN')}`}</Text>
                    </View>
                )}
            </View>
        );
    }

    function deliveryInfo() {
        const store = orderData?.selectedStore || null;
        const address = orderData?.shippingAddress || null;
        return (
            <View style={styles.infoCard}>
                <Text style={{ ...Fonts.blackColor16SemiBold, marginBottom: Sizes.fixPadding }}>
                    Delivery Details
                </Text>
                <View style={styles.infoRow}>
                    <Text style={{ ...Fonts.grayColor14Regular }}>Method</Text>
                    <Text style={{ ...Fonts.blackColor14Medium }}>{isPickup ? 'Store Pickup' : 'Home Delivery'}</Text>
                </View>
                {isPickup && store ? (
                    <View>
                        <Text style={{ ...Fonts.blackColor14Medium, marginTop: Sizes.fixPadding / 2 }}>{store.storeName || store.name || 'Selected Store'}</Text>
                        <Text style={{ ...Fonts.grayColor14Regular, marginTop: 2 }}>{store.address || ''}</Text>
                        {store.pickupDate ? (
                            <Text style={{ ...Fonts.grayColor14Regular, marginTop: 2 }}>Pickup Date: {new Date(store.pickupDate).toDateString()}</Text>
                        ) : null}
                    </View>
                ) : null}
                {!isPickup && address ? (
                    <Text style={{ ...Fonts.grayColor14Regular, marginTop: Sizes.fixPadding / 2 }}>{formatAddress(address)}</Text>
                ) : null}
            </View>
        );
    }

    function itemsInfo() {
        const items = orderData?.items || [];
        if (!items.length) return null;
        return (
            <View style={styles.infoCard}>
                <Text style={{ ...Fonts.blackColor16SemiBold, marginBottom: Sizes.fixPadding }}>
                    Items
                </Text>
                {items.map((item, index) => (
                    <View key={`${item.productId || item.productName || index}`} style={styles.infoRow}>
                        <Text style={{ ...Fonts.grayColor14Regular, flex: 1 }} numberOfLines={1}>
                            {item.productName || 'Item'}
                        </Text>
                        <Text style={{ ...Fonts.blackColor14Medium }}>x{item.quantity || 1}</Text>
                    </View>
                ))}
            </View>
        );
    }

    function orderInfo() {
        const status = orderData?.orderStatus || (orderData?.paymentStatus === 'paid' ? 'confirmed' : 'pending');
        return (
            <View style={{ alignItems: 'center', marginTop: Sizes.fixPadding * 2.0 }}>
                <Text style={{ ...Fonts.blackColor22Bold }}>
                    Order Placed Successfully!
                </Text>
                <Text style={{ ...Fonts.grayColor16Regular, marginTop: Sizes.fixPadding, textAlign: 'center' }}>
                    Thank you for your order. {isPickup ? 'Your order will be ready for pickup on your selected date.' : 'We will notify you when your order is shipped.'}
                </Text>
                <View style={styles.orderIdBadge}>
                    <Text style={{ ...Fonts.blackColor14SemiBold }}>Order ID: {orderId}</Text>
                </View>
                {status ? (
                    <Text style={{ ...Fonts.grayColor14Regular, marginTop: Sizes.fixPadding / 1.5 }}>
                        Status: {String(status).replace(/_/g, ' ')}
                    </Text>
                ) : null}
            </View>
        );
    }

    function successIcon() {
        return (
            <View style={styles.successIconWrap}>
                <Feather name="check" size={50} color={Colors.whiteColor} />
            </View>
        );
    }
}

export default OrderConfirmationScreen

const styles = StyleSheet.create({
    successIconWrap: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.greenColor,
        alignItems: 'center',
        justifyContent: 'center',
    },
    orderIdBadge: {
        backgroundColor: Colors.offWhiteColor,
        paddingHorizontal: Sizes.fixPadding * 2.0,
        paddingVertical: Sizes.fixPadding,
        borderRadius: Sizes.fixPadding,
        marginTop: Sizes.fixPadding * 2.0,
    },
    paymentCard: {
        width: '100%',
        backgroundColor: Colors.offWhiteColor,
        borderRadius: Sizes.fixPadding,
        padding: Sizes.fixPadding + 5.0,
        marginTop: Sizes.fixPadding * 2.0,
    },
    paymentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Sizes.fixPadding - 5.0,
    },
    noteCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        width: '100%',
        padding: Sizes.fixPadding,
        backgroundColor: Colors.offWhiteColor,
        borderRadius: Sizes.fixPadding,
        marginTop: Sizes.fixPadding * 2.0,
    },
    infoCard: {
        width: '100%',
        backgroundColor: Colors.offWhiteColor,
        borderRadius: Sizes.fixPadding,
        padding: Sizes.fixPadding + 5.0,
        marginTop: Sizes.fixPadding * 2.0,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Sizes.fixPadding - 5.0,
    },
    warningCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        width: '100%',
        padding: Sizes.fixPadding,
        backgroundColor: Colors.offWhiteColor,
        borderRadius: Sizes.fixPadding,
        marginTop: Sizes.fixPadding * 2.0,
    },
})
