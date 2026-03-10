import { StyleSheet, Text, View, ScrollView, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native'
import React, { useState, useEffect } from 'react'
import { Colors, Fonts, Sizes, CommomStyles, Screen } from '../../constants/styles';
import { MaterialIcons } from '@expo/vector-icons';
import MyStatusBar from '../../components/myStatusBar';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';

const OrderDetailScreen = () => {

    const navigation = useNavigation();
    const router = useRouter();
    const { orderDocId, orderId } = useLocalSearchParams();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrderDetails();
    }, []);

    const fetchOrderDetails = async () => {
        try {
            const getOrderDetails = httpsCallable(functions, 'getOrderDetails');
            const res = await getOrderDetails({ orderDocId });
            setOrder(res.data);
        } catch (err) {
            console.log('Error fetching order details:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return '';
        try {
            let date;
            if (dateValue.toDate) {
                date = dateValue.toDate();
            } else if (dateValue._seconds) {
                date = new Date(dateValue._seconds * 1000);
            } else {
                date = new Date(dateValue);
            }
            if (isNaN(date.getTime())) return '';
            return date.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return '';
        }
    };

    const getOrderStep = (status) => {
        switch (status?.toLowerCase()) {
            case 'confirmed':
            case 'processing':
                return 1;
            case 'ready_for_pickup':
            case 'out_for_delivery':
                return 2;
            case 'delivered':
                return 4;
            case 'cancelled':
                return 0;
            default:
                return 1;
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

    if (!order) {
        return (
            <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
                <MyStatusBar />
                {header()}
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ ...Fonts.grayColor15Regular }}>Failed to load order details.</Text>
                    <TouchableOpacity onPress={fetchOrderDetails} style={{ marginTop: Sizes.fixPadding }}>
                        <Text style={{ ...Fonts.primaryColor16Medium }}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const currentOrderStep = getOrderStep(order.orderStatus);
    const items = order.items || [];
    const orderSummary = order.orderSummary || {};
    const deliveryAddress = order.deliveryAddress || order.shippingAddress || {};
    const storeName = order.selectedStore?.name || '';

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {header()}
                <ScrollView automaticallyAdjustKeyboardInsets={true} showsVerticalScrollIndicator={false}>
                    {order.orderStatus !== 'cancelled' && orderStatusInfo()}
                    {orderItemsInfo()}
                    {deliveryDetailInfo()}
                    {priceDetailInfo()}
                </ScrollView>
            </View>
            {reorderButton()}
        </View>
    )

    function reorderButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.replace('/(tabs)/home/homeScreen')}
                style={CommomStyles.buttonStyle}
            >
                <Text style={{ ...Fonts.whiteColor19Medium }}>
                    Re-Order
                </Text>
            </TouchableOpacity>
        )
    }

    function priceDetailInfo() {
        return (
            <View style={{ margin: Sizes.fixPadding * 2.0, }}>
                <Text style={{ ...Fonts.blackColor18SemiBold }}>
                    Price Details
                </Text>
                <View style={styles.totalInfoWrapStyle}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: Sizes.fixPadding, }}>
                        <Text numberOfLines={1} style={{ ...Fonts.blackColor16Regular, flex: 1, }}>
                            Sub Total
                        </Text>
                        <Text style={{ textAlign: 'right', ...Fonts.blackColor16Regular, marginTop: Sizes.fixPadding - 5.0 }}>
                            {`₹ ${(orderSummary.subtotal || 0).toLocaleString('en-IN')}`}
                        </Text>
                    </View>
                    {(orderSummary.makingCharges > 0) && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: Sizes.fixPadding, }}>
                            <Text numberOfLines={1} style={{ ...Fonts.blackColor16Regular, flex: 1, }}>
                                Making Charges
                            </Text>
                            <Text style={{ textAlign: 'right', ...Fonts.blackColor16Regular }}>
                                {`₹ ${(orderSummary.makingCharges || 0).toLocaleString('en-IN')}`}
                            </Text>
                        </View>
                    )}
                    {(orderSummary.taxAmount > 0) && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: Sizes.fixPadding, }}>
                            <Text numberOfLines={1} style={{ ...Fonts.blackColor16Regular, flex: 1, }}>
                                Tax ({orderSummary.taxLabel || 'GST'})
                            </Text>
                            <Text style={{ textAlign: 'right', ...Fonts.blackColor16Regular }}>
                                {`₹ ${(orderSummary.taxAmount || 0).toLocaleString('en-IN')}`}
                            </Text>
                        </View>
                    )}
                    {(orderSummary.discount > 0) && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: Sizes.fixPadding, }}>
                            <Text numberOfLines={1} style={{ ...Fonts.greenColor16Regular || Fonts.blackColor16Regular, flex: 1, }}>
                                Discount
                            </Text>
                            <Text style={{ textAlign: 'right', ...Fonts.blackColor16Regular, color: Colors.greenColor }}>
                                {`- ₹ ${(orderSummary.discount || 0).toLocaleString('en-IN')}`}
                            </Text>
                        </View>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: Sizes.fixPadding, }}>
                        <Text numberOfLines={1} style={{ ...Fonts.blackColor16Regular, flex: 1, }}>
                            Delivery
                        </Text>
                        <Text style={{ textAlign: 'right', ...Fonts.blackColor16Regular, }}>
                            {order.deliveryType === 'store_pickup' ? 'Store Pickup' : 'Free'}
                        </Text>
                    </View>
                    <View style={styles.dashedLineStyle} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: Sizes.fixPadding, }}>
                        <Text numberOfLines={1} style={{ ...Fonts.blackColor16SemiBold, flex: 1, }}>
                            Total
                        </Text>
                        <Text style={{ textAlign: 'right', ...Fonts.blackColor16SemiBold, }}>
                            {`₹ ${(orderSummary.totalAmount || 0).toLocaleString('en-IN')}`}
                        </Text>
                    </View>
                </View>
            </View>
        )
    }

    function deliveryDetailInfo() {
        const isStorePickup = order.deliveryType === 'store_pickup';
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginVertical: Sizes.fixPadding }}>
                <Text style={{ ...Fonts.blackColor18SemiBold }}>
                    {isStorePickup ? 'Pickup Details' : 'Shipping Details'}
                </Text>
                <View style={styles.shippingDetailInfoWrapStyle}>
                    <View style={{ flexDirection: 'row', }}>
                        <Text numberOfLines={1} style={{ flex: 1, ...Fonts.grayColor16Regular }}>
                            Order Date
                        </Text>
                        <Text style={{ ...Fonts.blackColor16Regular }}>
                            {formatDate(order.orderedAt)}
                        </Text>
                    </View>
                    {isStorePickup ? (
                        storeName ? (
                            <View style={{ flexDirection: 'row', marginTop: Sizes.fixPadding }}>
                                <Text numberOfLines={1} style={{ flex: 1, ...Fonts.grayColor16Regular }}>
                                    Store
                                </Text>
                                <Text numberOfLines={2} style={{ maxWidth: Screen.width / 1.7, textAlign: 'right', ...Fonts.blackColor16Regular }}>
                                    {storeName}
                                </Text>
                            </View>
                        ) : null
                    ) : (
                        deliveryAddress.fullAddress || deliveryAddress.address ? (
                            <View style={{ flexDirection: 'row', marginTop: Sizes.fixPadding }}>
                                <Text numberOfLines={1} style={{ flex: 1, ...Fonts.grayColor16Regular }}>
                                    Address
                                </Text>
                                <Text numberOfLines={3} style={{ maxWidth: Screen.width / 1.7, textAlign: 'right', ...Fonts.blackColor16Regular }}>
                                    {deliveryAddress.fullAddress || deliveryAddress.address}
                                </Text>
                            </View>
                        ) : null
                    )}
                </View>
            </View>
        )
    }

    function orderItemsInfo() {

        const renderItem = ({ item, index }) => (
            <View style={styles.orderItemWrapStyle}>
                <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}>
                    <View style={styles.jewelleryImageWrapStyle}>
                        {item.image ? (
                            <Image
                                source={{ uri: item.image }}
                                style={{ width: '80%', resizeMode: 'contain', height: '80%', }}
                            />
                        ) : (
                            <MaterialIcons name="image" size={32} color={Colors.lightGrayColor} />
                        )}
                    </View>
                    <View style={{ flex: 1, marginLeft: Sizes.fixPadding + 3.0, }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Sizes.fixPadding - 13.0, }}>
                            <Text numberOfLines={1} style={{ flex: 1, ...Fonts.blackColor16Regular, marginRight: Sizes.fixPadding - 5.0 }}>
                                {item.productName || item.name || 'Product'}
                            </Text>
                            <Text style={{ ...Fonts.blackColor16Regular }}>
                                {`₹ ${(item.price || item.totalPrice || 0).toLocaleString('en-IN')}`}
                            </Text>
                        </View>
                        {item.size && (
                            <Text style={{ ...Fonts.grayColor14Regular, marginTop: -2.0 }}>
                                Size: {item.size}
                            </Text>
                        )}
                        {item.quantity > 1 && (
                            <Text style={{ ...Fonts.grayColor14Regular, marginTop: -2.0 }}>
                                Qty: {item.quantity}
                            </Text>
                        )}
                    </View>
                </View>
            </View>
        )
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, }}>
                <Text style={{ ...Fonts.blackColor18SemiBold }}>
                    Order Items
                </Text>
                <View style={{ marginTop: Sizes.fixPadding, }}>
                    <FlatList
                        data={items}
                        keyExtractor={(item, index) => `${item.productId || index}`}
                        renderItem={renderItem}
                        scrollEnabled={false}
                    />
                </View>
            </View>
        )
    }

    function orderStatusInfo() {
        return (
            <View style={{ flexDirection: 'row', margin: Sizes.fixPadding * 2.0, }}>
                <View style={{ width: Screen.width / 4.5, }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', }}>
                        <View style={{
                            ...styles.stepCircleStyle,
                            backgroundColor: currentOrderStep >= 1 ? Colors.blackColor : Colors.lightGrayColor,
                            marginLeft: ((Screen.width / 4.5) / 3.0),
                        }}>
                            <MaterialIcons name="check" size={16} color={Colors.whiteColor} />
                        </View>
                        <View style={{ flex: 1, backgroundColor: currentOrderStep >= 1 ? Colors.blackColor : Colors.lightGrayColor, height: 1.0, }} />
                    </View>
                    <Text numberOfLines={1} style={[currentOrderStep >= 1 ? { ...Fonts.blackColor16Regular } : { ...Fonts.lightGrayColor16Regular }, { textAlign: 'center', marginTop: Sizes.fixPadding, }]}>
                        Packing
                    </Text>
                </View>

                <View style={{ width: Screen.width / 4.5, }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', }}>
                        <View style={{ flex: 1, backgroundColor: currentOrderStep >= 1 ? Colors.blackColor : Colors.lightGrayColor, height: 1.0, }} />
                        <View style={{
                            ...styles.stepCircleStyle,
                            backgroundColor: currentOrderStep > 1 ? Colors.blackColor : Colors.lightGrayColor,
                        }}>
                            <MaterialIcons name="check" size={16} color={Colors.whiteColor} />
                        </View>
                        <View style={{ flex: 1, backgroundColor: currentOrderStep >= 2 ? Colors.blackColor : Colors.lightGrayColor, height: 1.0, }} />
                    </View>
                    <Text numberOfLines={1} style={[currentOrderStep > 1 ? { ...Fonts.blackColor16Regular } : { ...Fonts.lightGrayColor16Regular }, { textAlign: 'center', marginTop: Sizes.fixPadding, }]}>
                        Shipping
                    </Text>
                </View>

                <View style={{ width: Screen.width / 4.5, }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', }}>
                        <View style={{ flex: 1, backgroundColor: currentOrderStep >= 2 ? Colors.blackColor : Colors.lightGrayColor, height: 1.0, }} />
                        <View style={{
                            ...styles.stepCircleStyle,
                            backgroundColor: currentOrderStep >= 3 ? Colors.blackColor : Colors.lightGrayColor,
                        }}>
                            <MaterialIcons name="check" size={16} color={Colors.whiteColor} />
                        </View>
                        <View style={{ flex: 1, backgroundColor: currentOrderStep >= 3 ? Colors.blackColor : Colors.lightGrayColor, height: 1.0, }} />
                    </View>
                    <Text numberOfLines={1} style={[currentOrderStep >= 3 ? { ...Fonts.blackColor16Regular } : { ...Fonts.lightGrayColor16Regular }, { textAlign: 'center', marginTop: Sizes.fixPadding, }]}>
                        Arriving
                    </Text>
                </View>

                <View style={{ width: Screen.width / 4.5, }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', }}>
                        <View style={{ flex: 1, backgroundColor: currentOrderStep >= 3 ? Colors.blackColor : Colors.lightGrayColor, height: 1.0, }} />
                        <View style={{
                            ...styles.stepCircleStyle,
                            backgroundColor: currentOrderStep > 3 ? Colors.blackColor : Colors.lightGrayColor,
                            marginRight: ((Screen.width / 4.5) / 3.0),
                        }}>
                            <MaterialIcons name="check" size={16} color={Colors.whiteColor} />
                        </View>
                    </View>
                    <Text numberOfLines={1} style={[currentOrderStep > 3 ? { ...Fonts.blackColor16Regular } : { ...Fonts.lightGrayColor16Regular }, { textAlign: 'center', marginTop: Sizes.fixPadding, }]}>
                        Delivered
                    </Text>
                </View>
            </View>
        )
    }

    function header() {
        return (
            <View style={{ ...CommomStyles.headerStyle, }}>
                <MaterialIcons name="keyboard-backspace" size={26} color={Colors.blackColor} onPress={() => { navigation.pop() }} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Image source={require('../../assets/images/dp-logo-02.png')} style={CommomStyles.headerLogo} />
                </View>
                <View style={{ width: 26 }} />
            </View>
        )
    }
}

export default OrderDetailScreen

const styles = StyleSheet.create({
    stepCircleStyle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    jewelleryImageWrapStyle: {
        width: Screen.width / 4.8,
        height: 80.0,
        backgroundColor: Colors.whiteColor,
        elevation: 3.0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Sizes.fixPadding,
        shadowColor: Colors.blackColor,
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 0 }
    },
    orderItemWrapStyle: {
        flexDirection: 'row',
        borderColor: Colors.offWhiteColor,
        borderWidth: 1.0,
        borderRadius: Sizes.fixPadding,
        marginBottom: Sizes.fixPadding * 2.0,
        padding: Sizes.fixPadding,
    },
    shippingDetailInfoWrapStyle: {
        marginTop: Sizes.fixPadding,
        borderColor: Colors.offWhiteColor,
        borderWidth: 1.0,
        borderRadius: Sizes.fixPadding,
        padding: Sizes.fixPadding
    },
    totalInfoWrapStyle: {
        borderColor: Colors.offWhiteColor,
        borderWidth: 1.0,
        borderRadius: Sizes.fixPadding,
        paddingTop: Sizes.fixPadding - 5.0,
        paddingBottom: Sizes.fixPadding - 3.0,
        marginTop: Sizes.fixPadding,
    },
    dashedLineStyle: {
        borderColor: Colors.offWhiteColor,
        borderStyle: 'dashed',
        borderWidth: 1.0,
        marginVertical: Sizes.fixPadding - 3.0,
    },
})
