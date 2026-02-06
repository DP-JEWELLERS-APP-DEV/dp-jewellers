import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import { Colors, Fonts, Sizes, CommomStyles, Screen } from '../../constants/styles'
import { MaterialIcons, Feather } from '@expo/vector-icons';
import MyStatusBar from '../../components/myStatusBar';
import { useRouter, useLocalSearchParams } from 'expo-router';

const OrderConfirmationScreen = () => {

    const router = useRouter();
    const params = useLocalSearchParams();

    const orderId = params.orderId || '';
    const totalAmount = Number(params.totalAmount) || 0;
    const paidAmount = Number(params.paidAmount) || totalAmount;
    const remainingAmount = Number(params.remainingAmount) || 0;
    const deliveryMethod = params.deliveryMethod || 'home_delivery';

    const isPickup = deliveryMethod === 'store_pickup';

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Sizes.fixPadding * 2.0 }}>
                {successIcon()}
                {orderInfo()}
                {paymentInfo()}
                {isPickup && pickupNote()}
                {buttons()}
            </View>
        </View>
    )

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

    function orderInfo() {
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
})
