import { StyleSheet, Text, View, Image, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Colors, CommomStyles, Fonts, Screen, Sizes } from '../../../constants/styles';
import { MaterialIcons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, functions } from '../../../lib/firebase';

const placeholderImage = require('../../../assets/images/jewellery/jewellary1.png');

const CartScreen = () => {

    const navigation = useNavigation();
    const router = useRouter();

    const [cart, setcart] = useState([]);
    const [loading, setloading] = useState(true);
    const [errorText, seterrorText] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setIsAuthenticated(true);
                fetchCart();
            } else {
                setIsAuthenticated(false);
                setloading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const fetchCart = async () => {
        setloading(true);
        seterrorText('');
        try {
            const getCart = httpsCallable(functions, 'getCart');
            const res = await getCart();
            setcart(res?.data?.cart || []);
        } catch (err) {
            seterrorText('Failed to load cart.');
            setcart([]);
        } finally {
            setloading(false);
        }
    };

    // Show login prompt for unauthenticated users
    if (isAuthenticated === false) {
        return (
            <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
                {header()}
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Sizes.fixPadding * 2 }}>
                    <MaterialCommunityIcons name="shopping-outline" size={60} color={Colors.lightGrayColor} />
                    <Text style={{ ...Fonts.blackColor18SemiBold, marginTop: Sizes.fixPadding * 2.0, textAlign: 'center' }}>
                        Login to view your cart
                    </Text>
                    <Text style={{ ...Fonts.grayColor15Regular, marginTop: Sizes.fixPadding - 5, textAlign: 'center' }}>
                        Sign in to add items to your cart and checkout
                    </Text>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => navigation.push('auth/loginScreen')}
                        style={styles.loginButton}
                    >
                        <Text style={{ ...Fonts.whiteColor19Medium }}>
                            Login
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <View style={{ flex: 1 }}>
                {header()}
                {loading ? (
                    <View style={styles.centerWrap}>
                        <ActivityIndicator color={Colors.primaryColor} />
                    </View>
                ) : errorText ? (
                    <View style={styles.centerWrap}>
                        <Text style={styles.errorText}>{errorText}</Text>
                    </View>
                ) : cart.length == 0 ? (
                    noCartItemsInfo()
                ) : (
                    cartItems()
                )}
            </View>
        </View>
    )

    function noCartItemsInfo() {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="shopping-outline" size={40} color={Colors.lightGrayColor} />
                <Text style={{ ...Fonts.lightGrayColor18SemiBold, color: Colors.lightGrayColor, marginTop: Sizes.fixPadding - 5.0 }}>
                    Cart is Empty
                </Text>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.replace('/(tabs)/home/homeScreen')}
                    style={[styles.loginButton, { marginTop: Sizes.fixPadding * 2 }]}
                >
                    <Text style={{ ...Fonts.whiteColor19Medium }}>
                        Start Shopping
                    </Text>
                </TouchableOpacity>
            </View>
        )
    }

    function cartItems() {
        return (
            <FlatList
                ListHeaderComponent={
                    <>
                        {cartItemsInfo()}
                        {totalInfo()}
                        {proceedToCheckoutButton()}
                    </>
                }
                showsVerticalScrollIndicator={false}
            />
        )
    }

    function proceedToCheckoutButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                    navigation.push('checkout/deliveryMethodScreen');
                }}
                style={{ ...CommomStyles.buttonStyle, marginTop: Sizes.fixPadding * 2.0 }}
            >
                <Text style={{ ...Fonts.whiteColor19Medium }}>
                    Proceed to Checkout
                </Text>
            </TouchableOpacity>
        )
    }

    function totalInfo() {
        const subTotal = cart.reduce((acc, item) => acc + (item.quantity || 0) * (item.finalPrice || 0), 0);
        const deliveryCharge = 0;
        const total = subTotal + deliveryCharge;
        return (
            <View style={styles.totalInfoWrapStyle}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: Sizes.fixPadding, }}>
                    <Text numberOfLines={1} style={{ ...Fonts.blackColor16Regular, flex: 1, }}>
                        Sub Total
                    </Text>
                    <Text style={{ textAlign: 'right', ...Fonts.blackColor16Regular, marginTop: Sizes.fixPadding - 5.0 }}>
                        {`₹ ${subTotal.toLocaleString('en-IN')}`}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: Sizes.fixPadding, }}>
                    <Text numberOfLines={1} style={{ ...Fonts.blackColor16Regular, flex: 1, }}>
                        Delivery
                    </Text>
                    <Text style={{ textAlign: 'right', ...Fonts.blackColor16Regular, }}>
                        Free
                    </Text>
                </View>
                <View style={styles.dashedLineStyle} />
                <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: Sizes.fixPadding, }}>
                    <Text numberOfLines={1} style={{ ...Fonts.blackColor16SemiBold, flex: 1, }}>
                        Total
                    </Text>
                    <Text style={{ textAlign: 'right', ...Fonts.blackColor16SemiBold, }}>
                        {`₹ ${total.toLocaleString('en-IN')}`}
                    </Text>
                </View>
            </View>
        )
    }

    async function updateQty({ productId, size, quantity }) {
        try {
            const updateCart = httpsCallable(functions, 'updateCart');
            await updateCart({
                action: 'update',
                productId,
                size: size || null,
                quantity,
            });
            await fetchCart();
        } catch (err) {
            seterrorText('Failed to update cart.');
        }
    }

    async function removeItem({ productId, size }) {
        try {
            const updateCart = httpsCallable(functions, 'updateCart');
            await updateCart({
                action: 'remove',
                productId,
                size: size || null,
            });
            await fetchCart();
        } catch (err) {
            seterrorText('Failed to remove item.');
        }
    }

    function cartItemsInfo() {
        const renderItem = ({ item }) => (
            <View style={styles.cartItemWrapStyle}>
                <View style={{ flexDirection: 'row', flex: 1, }}>
                    <View style={styles.jewelleryImageWrapStyle}>
                        <Image
                            source={item.image ? { uri: item.image } : placeholderImage}
                            style={{ width: '80%', resizeMode: 'contain', height: '80%', }}
                        />
                    </View>
                    <View style={{ flex: 1, marginLeft: Sizes.fixPadding + 3.0, }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Sizes.fixPadding - 13.0, }}>
                            <Text numberOfLines={1} style={{ flex: 1, ...Fonts.blackColor16Regular, marginRight: Sizes.fixPadding - 5.0 }}>
                                {item.name}
                            </Text>
                            <Text style={{ ...Fonts.blackColor16Regular }}>
                                {`₹ ${Number(item.finalPrice || 0).toLocaleString('en-IN')}`}
                            </Text>
                        </View>
                        <Text style={{ ...Fonts.grayColor14Regular, marginTop: -2.0 }}>
                            Size: {item.size || 'N/A'}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Sizes.fixPadding - 4.0 }}>
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', }}>
                                <TouchableOpacity
                                    activeOpacity={0.5}
                                    onPress={() => {
                                        if (item.quantity > 1) {
                                            updateQty({
                                                productId: item.productId,
                                                size: item.size,
                                                quantity: item.quantity - 1
                                            })
                                        }
                                    }}
                                    style={styles.addRemoveBoxStyle}
                                >
                                    <MaterialIcons name="remove" size={15} color={Colors.blackColor} />
                                </TouchableOpacity>
                                <Text style={{ ...Fonts.blackColor14Bold, marginHorizontal: Sizes.fixPadding + 5.0, }}>
                                    {item.quantity}
                                </Text>
                                <TouchableOpacity
                                    activeOpacity={0.5}
                                    onPress={() => {
                                        updateQty({
                                            productId: item.productId,
                                            size: item.size,
                                            quantity: (item.quantity || 0) + 1
                                        })
                                    }}
                                    style={styles.addRemoveBoxStyle}
                                >
                                    <MaterialIcons name="add" size={15} color={Colors.blackColor} />
                                </TouchableOpacity>
                            </View>
                            <Feather
                                name="trash-2"
                                size={18}
                                color={Colors.blackColor}
                                onPress={() => { removeItem({ productId: item.productId, size: item.size }) }}
                            />
                        </View>
                    </View>
                </View>
            </View>
        )
        return (
            <View style={{ marginTop: Sizes.fixPadding * 2.0, }}>
                <FlatList
                    data={cart}
                    keyExtractor={(item) => `${item.productId}-${item.size || 'na'}`}
                    renderItem={renderItem}
                    scrollEnabled={false}
                />
            </View>
        )
    }

    function header() {
        return (
            <View style={styles.headerStyle}>
                <Text style={{ ...Fonts.blackColor18SemiBold, flex: 1 }}>
                    Shopping Cart
                </Text>
                <TouchableOpacity onPress={() => router.replace('/(tabs)/home/homeScreen')} activeOpacity={0.7}>
                    <Image source={require('../../../assets/images/dp-logo-02.png')} style={styles.headerLogo} />
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
            </View>
        )
    }
}

export default CartScreen

const styles = StyleSheet.create({
    headerStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Sizes.fixPadding * 2.0,
        paddingVertical: Sizes.fixPadding,
        borderBottomColor: Colors.offWhiteColor,
        borderBottomWidth: 1.0,
    },
    headerLogo: {
        width: Screen.width / 3,
        height: 55,
        resizeMode: 'contain',
    },
    loginButton: {
        backgroundColor: Colors.blackColor,
        paddingHorizontal: Sizes.fixPadding * 4,
        paddingVertical: Sizes.fixPadding + 2,
        borderRadius: Sizes.fixPadding,
        marginTop: Sizes.fixPadding * 2.5,
    },
    addRemoveBoxStyle: {
        borderColor: Colors.offWhiteColor,
        borderWidth: 1.0,
        width: 26.0,
        height: 26.0,
        borderRadius: Sizes.fixPadding - 5.0,
        alignItems: 'center',
        justifyContent: 'center'
    },
    jewelleryImageWrapStyle: {
        width: Screen.width / 4.8,
        height: 80.0,
        backgroundColor: Colors.whiteColor,
        elevation: 3.0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Sizes.fixPadding,
    },
    cartItemWrapStyle: {
        flexDirection: 'row',
        borderColor: Colors.offWhiteColor,
        borderWidth: 1.0,
        marginHorizontal: Sizes.fixPadding * 2.0,
        borderRadius: Sizes.fixPadding,
        marginBottom: Sizes.fixPadding * 2.0,
        padding: Sizes.fixPadding
    },
    dashedLineStyle: {
        borderColor: Colors.offWhiteColor,
        borderStyle: 'dashed',
        borderWidth: 1.0,
        marginVertical: Sizes.fixPadding - 3.0,
    },
    totalInfoWrapStyle: {
        borderColor: Colors.offWhiteColor,
        borderWidth: 1.0,
        borderRadius: Sizes.fixPadding,
        marginHorizontal: Sizes.fixPadding * 2.0,
        paddingTop: Sizes.fixPadding - 5.0,
        paddingBottom: Sizes.fixPadding - 3.0
    },
    centerWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        ...Fonts.grayColor15Regular,
        color: Colors.redColor,
    },
})
