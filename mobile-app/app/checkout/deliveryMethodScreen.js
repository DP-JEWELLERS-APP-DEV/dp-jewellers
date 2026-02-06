import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator } from 'react-native'
import React, { useState, useEffect } from 'react'
import { Colors, Fonts, Sizes, CommomStyles } from '../../constants/styles'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation, useRouter } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../../lib/firebase';

const DeliveryMethodScreen = () => {

    const navigation = useNavigation();
    const router = useRouter();

    const [deliveryMethod, setDeliveryMethod] = useState(null); // 'store_pickup' or 'home_delivery'
    const [cartTotal, setCartTotal] = useState(0);
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCart();
    }, []);

    const fetchCart = async () => {
        try {
            const getCart = httpsCallable(functions, 'getCart');
            const res = await getCart();
            const items = res?.data?.cart || [];
            setCartItems(items);
            const total = items.reduce((acc, item) => acc + (item.quantity || 0) * (item.finalPrice || 0), 0);
            setCartTotal(total);
        } catch (err) {
            console.log('Error fetching cart:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (!deliveryMethod) return;

        if (deliveryMethod === 'store_pickup') {
            navigation.push('checkout/storePickupScreen', { cartTotal });
        } else {
            navigation.push('selectAddress/selectAddressScreen', {
                deliveryMethod: 'home_delivery',
                cartTotal
            });
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
                <View style={{ flex: 1, padding: Sizes.fixPadding * 2.0 }}>
                    <Text style={{ ...Fonts.blackColor18SemiBold, marginBottom: Sizes.fixPadding * 2.0 }}>
                        How would you like to receive your order?
                    </Text>

                    {deliveryMethodOption({
                        icon: 'storefront',
                        title: 'In-Store Pickup',
                        description: 'Pick up your order from our store. Pay minimum 10% now, rest at pickup.',
                        value: 'store_pickup',
                    })}

                    {deliveryMethodOption({
                        icon: 'local-shipping',
                        title: 'Home Delivery',
                        description: 'Get your order delivered to your doorstep. Full payment required.',
                        value: 'home_delivery',
                    })}

                    {cartTotalInfo()}
                </View>
            </View>
            {nextButton()}
        </View>
    )

    function cartTotalInfo() {
        return (
            <View style={styles.cartTotalWrap}>
                <Text style={{ ...Fonts.grayColor14Regular }}>Order Total</Text>
                <Text style={{ ...Fonts.blackColor18SemiBold }}>
                    {`₹ ${cartTotal.toLocaleString('en-IN')}`}
                </Text>
            </View>
        );
    }

    function deliveryMethodOption({ icon, title, description, value }) {
        const isSelected = deliveryMethod === value;
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setDeliveryMethod(value)}
                style={[
                    styles.optionWrap,
                    isSelected && styles.optionWrapSelected
                ]}
            >
                <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                    <MaterialIcons name={icon} size={28} color={isSelected ? Colors.whiteColor : Colors.blackColor} />
                </View>
                <View style={{ flex: 1, marginLeft: Sizes.fixPadding + 5.0 }}>
                    <Text style={{ ...Fonts.blackColor16SemiBold }}>{title}</Text>
                    <Text style={{ ...Fonts.grayColor14Regular, marginTop: 4 }}>{description}</Text>
                </View>
                <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                </View>
            </TouchableOpacity>
        );
    }

    function nextButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleNext}
                disabled={!deliveryMethod}
                style={[
                    CommomStyles.buttonStyle,
                    !deliveryMethod && { backgroundColor: Colors.lightGrayColor }
                ]}
            >
                <Text style={{ ...Fonts.whiteColor19Medium }}>
                    Continue
                </Text>
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

export default DeliveryMethodScreen

const styles = StyleSheet.create({
    optionWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: Colors.offWhiteColor,
        borderRadius: Sizes.fixPadding,
        padding: Sizes.fixPadding + 5.0,
        marginBottom: Sizes.fixPadding * 2.0,
    },
    optionWrapSelected: {
        borderColor: Colors.blackColor,
        backgroundColor: Colors.offWhiteColor,
    },
    iconWrap: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: Colors.offWhiteColor,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapSelected: {
        backgroundColor: Colors.blackColor,
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
    cartTotalWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Sizes.fixPadding + 5.0,
        backgroundColor: Colors.offWhiteColor,
        borderRadius: Sizes.fixPadding,
        marginTop: 'auto',
    },
})
