import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from 'react-native'
import React, { useState, useEffect } from 'react'
import { Colors, Fonts, Sizes, CommomStyles, Screen } from '../../constants/styles'
import { MaterialIcons, Feather } from '@expo/vector-icons';
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation, useRouter, useLocalSearchParams } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';
import RazorpayCheckout from 'react-native-razorpay';

const placeholderImage = require('../../assets/images/jewellery/jewellary1.png');

// Razorpay Key - Replace with your actual key
const RAZORPAY_KEY = 'rzp_test_YOUR_KEY_ID'; // Use rzp_live_XXX for production

const OrderSummaryScreen = () => {

    const navigation = useNavigation();
    const router = useRouter();
    const params = useLocalSearchParams();

    const deliveryMethod = params.deliveryMethod;
    const cartTotal = Number(params.cartTotal) || 0;
    const selectedStore = params.selectedStore ? JSON.parse(params.selectedStore) : null;
    const pickupDate = params.pickupDate ? new Date(params.pickupDate) : null;
    const selectedAddress = params.selectedAddress ? JSON.parse(params.selectedAddress) : null;

    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [paymentOption, setPaymentOption] = useState('full'); // 'full' or 'partial' (only for pickup)

    const isPickup = deliveryMethod === 'store_pickup';
    const minPayment = Math.ceil(cartTotal * 0.1);
    const payableAmount = isPickup && paymentOption === 'partial' ? minPayment : cartTotal;
    const remainingAmount = isPickup && paymentOption === 'partial' ? cartTotal - minPayment : 0;

    useEffect(() => {
        fetchCart();
    }, []);

    const fetchCart = async () => {
        try {
            const getCart = httpsCallable(functions, 'getCart');
            const res = await getCart();
            setCartItems(res?.data?.cart || []);
        } catch (err) {
            console.log('Error fetching cart:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        setProcessingPayment(true);

        try {
            // For now, we'll simulate Razorpay. In production, you would:
            // 1. Create order on your backend (Firebase function)
            // 2. Get order_id from Razorpay
            // 3. Open Razorpay checkout

            // Simulating payment success for demo
            // In production, use RazorpayCheckout.open() with proper options

            const options = {
                description: 'DP Jewellers Order Payment',
                image: 'https://your-logo-url.com/logo.png',
                currency: 'INR',
                key: RAZORPAY_KEY,
                amount: payableAmount * 100, // Razorpay expects amount in paise
                name: 'DP Jewellers',
                prefill: {
                    email: '',
                    contact: '',
                    name: ''
                },
                theme: { color: Colors.primaryColor }
            };

            // Uncomment this for actual Razorpay integration
            // const data = await RazorpayCheckout.open(options);

            // For now, directly create order
            await createOrder();

        } catch (error) {
            console.log('Payment error:', error);
            Alert.alert('Payment Failed', 'Something went wrong with the payment. Please try again.');
        } finally {
            setProcessingPayment(false);
        }
    };

    const createOrder = async () => {
        try {
            const orderData = {
                items: cartItems.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity || 1,
                    selectedSize: item.size || null,
                })),
                deliveryType: deliveryMethod,
                shippingAddress: selectedAddress || null,
                selectedStore: selectedStore ? {
                    storeId: selectedStore.id,
                    storeName: selectedStore.name,
                    address: selectedStore.address,
                    city: selectedStore.city,
                    pickupDate: pickupDate?.toISOString() || null,
                } : null,
                paymentMethod: 'online',
                partialPayment: isPickup && paymentOption === 'partial' ? {
                    amountPaid: payableAmount,
                    amountRemaining: remainingAmount,
                } : null,
            };

            const createOrderFn = httpsCallable(functions, 'createOrder');
            const result = await createOrderFn(orderData);

            if (result.data?.orderId) {
                navigation.reset({
                    index: 0,
                    routes: [
                        { name: '(tabs)' },
                        {
                            name: 'checkout/orderConfirmationScreen',
                            params: {
                                orderId: result.data.orderId,
                                orderDocId: result.data.orderDocId,
                                totalAmount: result.data.totalAmount,
                                deliveryMethod,
                                paidAmount: payableAmount,
                                remainingAmount,
                            }
                        }
                    ],
                });
            }
        } catch (error) {
            console.log('Order creation error:', error);
            Alert.alert('Order Failed', error.message || 'Failed to create order. Please try again.');
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
                <ScrollView showsVerticalScrollIndicator={false}>
                    {deliveryInfoSection()}
                    {orderItemsSection()}
                    {isPickup && paymentOptionsSection()}
                    {priceSummarySection()}
                </ScrollView>
            </View>
            {payButton()}
        </View>
    )

    function paymentOptionsSection() {
        return (
            <View style={styles.section}>
                <Text style={{ ...Fonts.blackColor16SemiBold, marginBottom: Sizes.fixPadding }}>
                    Payment Option
                </Text>

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setPaymentOption('partial')}
                    style={[styles.paymentOptionCard, paymentOption === 'partial' && styles.paymentOptionSelected]}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={{ ...Fonts.blackColor16Medium }}>Pay 10% Now</Text>
                        <Text style={{ ...Fonts.grayColor14Regular, marginTop: 2 }}>
                            Pay ₹{minPayment.toLocaleString('en-IN')} now, rest at pickup
                        </Text>
                    </View>
                    <View style={[styles.radioOuter, paymentOption === 'partial' && styles.radioOuterSelected]}>
                        {paymentOption === 'partial' && <View style={styles.radioInner} />}
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setPaymentOption('full')}
                    style={[styles.paymentOptionCard, paymentOption === 'full' && styles.paymentOptionSelected]}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={{ ...Fonts.blackColor16Medium }}>Pay Full Amount</Text>
                        <Text style={{ ...Fonts.grayColor14Regular, marginTop: 2 }}>
                            Pay ₹{cartTotal.toLocaleString('en-IN')} now
                        </Text>
                    </View>
                    <View style={[styles.radioOuter, paymentOption === 'full' && styles.radioOuterSelected]}>
                        {paymentOption === 'full' && <View style={styles.radioInner} />}
                    </View>
                </TouchableOpacity>
            </View>
        );
    }

    function priceSummarySection() {
        return (
            <View style={styles.section}>
                <Text style={{ ...Fonts.blackColor16SemiBold, marginBottom: Sizes.fixPadding }}>
                    Order Summary
                </Text>
                <View style={styles.priceCard}>
                    <View style={styles.priceRow}>
                        <Text style={{ ...Fonts.grayColor14Regular }}>Order Total</Text>
                        <Text style={{ ...Fonts.blackColor16Regular }}>{`₹ ${cartTotal.toLocaleString('en-IN')}`}</Text>
                    </View>
                    <View style={styles.priceRow}>
                        <Text style={{ ...Fonts.grayColor14Regular }}>Delivery</Text>
                        <Text style={{ ...Fonts.blackColor16Regular, color: Colors.greenColor }}>Free</Text>
                    </View>
                    {isPickup && paymentOption === 'partial' && (
                        <>
                            <View style={styles.dashedLine} />
                            <View style={styles.priceRow}>
                                <Text style={{ ...Fonts.blackColor14SemiBold }}>Pay Now (10%)</Text>
                                <Text style={{ ...Fonts.blackColor16SemiBold }}>{`₹ ${payableAmount.toLocaleString('en-IN')}`}</Text>
                            </View>
                            <View style={styles.priceRow}>
                                <Text style={{ ...Fonts.grayColor14Regular }}>Due at Pickup</Text>
                                <Text style={{ ...Fonts.grayColor14Regular }}>{`₹ ${remainingAmount.toLocaleString('en-IN')}`}</Text>
                            </View>
                        </>
                    )}
                    {(!isPickup || paymentOption === 'full') && (
                        <>
                            <View style={styles.dashedLine} />
                            <View style={styles.priceRow}>
                                <Text style={{ ...Fonts.blackColor14SemiBold }}>Total Payable</Text>
                                <Text style={{ ...Fonts.blackColor16SemiBold }}>{`₹ ${payableAmount.toLocaleString('en-IN')}`}</Text>
                            </View>
                        </>
                    )}
                </View>
            </View>
        );
    }

    function orderItemsSection() {
        return (
            <View style={styles.section}>
                <Text style={{ ...Fonts.blackColor16SemiBold, marginBottom: Sizes.fixPadding }}>
                    Order Items ({cartItems.length})
                </Text>
                {cartItems.map((item, index) => (
                    <View key={`${item.productId}-${index}`} style={styles.itemCard}>
                        <Image
                            source={item.image ? { uri: item.image } : placeholderImage}
                            style={styles.itemImage}
                        />
                        <View style={{ flex: 1, marginLeft: Sizes.fixPadding }}>
                            <Text style={{ ...Fonts.blackColor14Medium }} numberOfLines={2}>{item.name}</Text>
                            <Text style={{ ...Fonts.grayColor12Regular, marginTop: 2 }}>
                                Qty: {item.quantity || 1} {item.size ? `| Size: ${item.size}` : ''}
                            </Text>
                            <Text style={{ ...Fonts.blackColor14SemiBold, marginTop: 4 }}>
                                ₹ {Number(item.finalPrice || 0).toLocaleString('en-IN')}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>
        );
    }

    function deliveryInfoSection() {
        const formatPickupDate = (date) => {
            if (!date) return '';
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            return date.toLocaleDateString('en-IN', options);
        };

        return (
            <View style={styles.section}>
                <Text style={{ ...Fonts.blackColor16SemiBold, marginBottom: Sizes.fixPadding }}>
                    {isPickup ? 'Pickup Details' : 'Delivery Details'}
                </Text>
                <View style={styles.deliveryCard}>
                    <MaterialIcons
                        name={isPickup ? 'storefront' : 'local-shipping'}
                        size={24}
                        color={Colors.blackColor}
                    />
                    <View style={{ flex: 1, marginLeft: Sizes.fixPadding }}>
                        {isPickup ? (
                            <>
                                <Text style={{ ...Fonts.blackColor14SemiBold }}>{selectedStore?.name}</Text>
                                <Text style={{ ...Fonts.grayColor14Regular, marginTop: 2 }}>
                                    {selectedStore?.address}
                                </Text>
                                <Text style={{ ...Fonts.grayColor14Regular }}>
                                    {selectedStore?.city} - {selectedStore?.pincode}
                                </Text>
                                <View style={styles.pickupDateBadge}>
                                    <Feather name="calendar" size={14} color={Colors.primaryColor} />
                                    <Text style={{ ...Fonts.primaryColor14Medium, marginLeft: 4 }}>
                                        Pickup: {formatPickupDate(pickupDate)}
                                    </Text>
                                </View>
                            </>
                        ) : (
                            <>
                                <Text style={{ ...Fonts.blackColor14SemiBold }}>{selectedAddress?.addressType}</Text>
                                <Text style={{ ...Fonts.grayColor14Regular, marginTop: 2 }}>
                                    {selectedAddress?.name} | {selectedAddress?.mobileNo}
                                </Text>
                                <Text style={{ ...Fonts.grayColor14Regular }}>
                                    {selectedAddress?.address}
                                </Text>
                            </>
                        )}
                    </View>
                </View>
            </View>
        );
    }

    function payButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={handlePayment}
                disabled={processingPayment}
                style={[CommomStyles.buttonStyle, processingPayment && { backgroundColor: Colors.lightGrayColor }]}
            >
                {processingPayment ? (
                    <ActivityIndicator color={Colors.whiteColor} />
                ) : (
                    <Text style={{ ...Fonts.whiteColor19Medium }}>
                        Pay ₹ {payableAmount.toLocaleString('en-IN')}
                    </Text>
                )}
            </TouchableOpacity>
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

export default OrderSummaryScreen

const styles = StyleSheet.create({
    section: {
        padding: Sizes.fixPadding * 2.0,
        borderBottomWidth: 8,
        borderBottomColor: Colors.offWhiteColor,
    },
    deliveryCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: Sizes.fixPadding + 5.0,
        backgroundColor: Colors.offWhiteColor,
        borderRadius: Sizes.fixPadding,
    },
    pickupDateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Sizes.fixPadding,
        backgroundColor: Colors.whiteColor,
        paddingHorizontal: Sizes.fixPadding,
        paddingVertical: 4,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Sizes.fixPadding,
        borderWidth: 1,
        borderColor: Colors.offWhiteColor,
        borderRadius: Sizes.fixPadding,
        marginBottom: Sizes.fixPadding,
    },
    itemImage: {
        width: 60,
        height: 60,
        resizeMode: 'contain',
        borderRadius: Sizes.fixPadding - 5,
    },
    paymentOptionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Sizes.fixPadding + 5.0,
        borderWidth: 1.5,
        borderColor: Colors.offWhiteColor,
        borderRadius: Sizes.fixPadding,
        marginBottom: Sizes.fixPadding,
    },
    paymentOptionSelected: {
        borderColor: Colors.blackColor,
        backgroundColor: Colors.offWhiteColor,
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: Colors.lightGrayColor,
        alignItems: 'center',
        justifyContent: 'center',
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
    priceCard: {
        padding: Sizes.fixPadding,
        backgroundColor: Colors.offWhiteColor,
        borderRadius: Sizes.fixPadding,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Sizes.fixPadding - 5.0,
    },
    dashedLine: {
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: Colors.lightGrayColor,
        marginVertical: Sizes.fixPadding - 5.0,
    },
})
