import { StyleSheet, Text, View, TouchableOpacity, Image, FlatList, ActivityIndicator, ScrollView } from 'react-native'
import React, { useState, useEffect } from 'react'
import { Colors, Fonts, Sizes, CommomStyles, Screen } from '../../constants/styles'
import { MaterialIcons, Feather } from '@expo/vector-icons';
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation, useRouter, useLocalSearchParams } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';

const StorePickupScreen = () => {

    const navigation = useNavigation();
    const router = useRouter();
    const params = useLocalSearchParams();
    const cartTotal = Number(params.cartTotal) || 0;

    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStore] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Generate available dates (next 14 days, excluding Sundays)
    const [availableDates, setAvailableDates] = useState([]);

    useEffect(() => {
        fetchStores();
        generateAvailableDates();
    }, []);

    const fetchStores = async () => {
        try {
            const getActiveStores = httpsCallable(functions, 'getActiveStores');
            const res = await getActiveStores();
            setStores(res?.data?.stores || []);
        } catch (err) {
            console.log('Error fetching stores:', err);
            setError('Failed to load stores. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const generateAvailableDates = () => {
        const dates = [];
        const today = new Date();
        let currentDate = new Date(today);
        currentDate.setDate(currentDate.getDate() + 1); // Start from tomorrow

        while (dates.length < 14) {
            // Skip Sundays (0 = Sunday)
            if (currentDate.getDay() !== 0) {
                dates.push(new Date(currentDate));
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        setAvailableDates(dates);
    };

    const formatDate = (date) => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return {
            day: days[date.getDay()],
            date: date.getDate(),
            month: months[date.getMonth()],
            full: date.toISOString().split('T')[0],
        };
    };

    const handleNext = () => {
        if (!selectedStore || !selectedDate) return;

        navigation.push('checkout/orderSummaryScreen', {
            deliveryMethod: 'store_pickup',
            selectedStore: JSON.stringify(selectedStore),
            pickupDate: selectedDate.toISOString(),
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
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Sizes.fixPadding * 2.0 }}>
                    {error ? (
                        <Text style={styles.errorText}>{error}</Text>
                    ) : (
                        <>
                            {storeSelectionSection()}
                            {dateSelectionSection()}
                            {paymentInfoSection()}
                        </>
                    )}
                </ScrollView>
            </View>
            {nextButton()}
        </View>
    )

    function paymentInfoSection() {
        const minPayment = Math.ceil(cartTotal * 0.1);
        return (
            <View style={styles.infoSection}>
                <Text style={{ ...Fonts.blackColor16SemiBold, marginBottom: Sizes.fixPadding }}>
                    Payment Info
                </Text>
                <View style={styles.infoCard}>
                    <MaterialIcons name="info-outline" size={20} color={Colors.primaryColor} />
                    <Text style={{ ...Fonts.grayColor14Regular, flex: 1, marginLeft: Sizes.fixPadding }}>
                        For in-store pickup, you need to pay minimum 10% of the order total now.
                        The remaining amount can be paid at the store during pickup.
                    </Text>
                </View>
                <View style={styles.priceRow}>
                    <Text style={{ ...Fonts.grayColor14Regular }}>Order Total</Text>
                    <Text style={{ ...Fonts.blackColor16Regular }}>{`₹ ${cartTotal.toLocaleString('en-IN')}`}</Text>
                </View>
                <View style={styles.priceRow}>
                    <Text style={{ ...Fonts.grayColor14Regular }}>Minimum Payment (10%)</Text>
                    <Text style={{ ...Fonts.blackColor16SemiBold }}>{`₹ ${minPayment.toLocaleString('en-IN')}`}</Text>
                </View>
            </View>
        );
    }

    function dateSelectionSection() {
        return (
            <View style={styles.section}>
                <Text style={{ ...Fonts.blackColor16SemiBold, marginBottom: Sizes.fixPadding }}>
                    Select Pickup Date
                </Text>
                <FlatList
                    data={availableDates}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item, index) => `date-${index}`}
                    renderItem={({ item }) => {
                        const formatted = formatDate(item);
                        const isSelected = selectedDate && formatDate(selectedDate).full === formatted.full;
                        return (
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => setSelectedDate(item)}
                                style={[styles.dateCard, isSelected && styles.dateCardSelected]}
                            >
                                <Text style={[styles.dayText, isSelected && styles.selectedText]}>{formatted.day}</Text>
                                <Text style={[styles.dateText, isSelected && styles.selectedText]}>{formatted.date}</Text>
                                <Text style={[styles.monthText, isSelected && styles.selectedText]}>{formatted.month}</Text>
                            </TouchableOpacity>
                        );
                    }}
                    contentContainerStyle={{ paddingRight: Sizes.fixPadding }}
                />
            </View>
        );
    }

    function storeSelectionSection() {
        return (
            <View style={styles.section}>
                <Text style={{ ...Fonts.blackColor16SemiBold, marginBottom: Sizes.fixPadding }}>
                    Select Store for Pickup
                </Text>
                {stores.length === 0 ? (
                    <Text style={{ ...Fonts.grayColor14Regular }}>No stores available for pickup.</Text>
                ) : (
                    stores.map((store) => {
                        const isSelected = selectedStore?.id === store.id;
                        return (
                            <TouchableOpacity
                                key={store.id}
                                activeOpacity={0.8}
                                onPress={() => setSelectedStore(store)}
                                style={[styles.storeCard, isSelected && styles.storeCardSelected]}
                            >
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{ ...Fonts.blackColor16Medium, flex: 1 }}>{store.name}</Text>
                                        {store.isPrimary && (
                                            <View style={styles.primaryBadge}>
                                                <Text style={{ ...Fonts.whiteColor12Medium }}>Main Store</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={{ ...Fonts.grayColor14Regular, marginTop: 4 }}>
                                        {store.address}
                                    </Text>
                                    <Text style={{ ...Fonts.grayColor14Regular }}>
                                        {store.city}{store.state ? `, ${store.state}` : ''} - {store.pincode}
                                    </Text>
                                    {store.phone && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                            <Feather name="phone" size={12} color={Colors.grayColor} />
                                            <Text style={{ ...Fonts.grayColor14Regular, marginLeft: 4 }}>{store.phone}</Text>
                                        </View>
                                    )}
                                    {store.openingHours && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                            <Feather name="clock" size={12} color={Colors.grayColor} />
                                            <Text style={{ ...Fonts.grayColor14Regular, marginLeft: 4 }}>{store.openingHours}</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                                    {isSelected && <View style={styles.radioInner} />}
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </View>
        );
    }

    function nextButton() {
        const isDisabled = !selectedStore || !selectedDate;
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleNext}
                disabled={isDisabled}
                style={[CommomStyles.buttonStyle, isDisabled && { backgroundColor: Colors.lightGrayColor }]}
            >
                <Text style={{ ...Fonts.whiteColor19Medium }}>
                    Continue to Payment
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

export default StorePickupScreen

const styles = StyleSheet.create({
    section: {
        marginBottom: Sizes.fixPadding * 2.5,
    },
    infoSection: {
        marginBottom: Sizes.fixPadding * 2.0,
    },
    storeCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderWidth: 1.5,
        borderColor: Colors.offWhiteColor,
        borderRadius: Sizes.fixPadding,
        padding: Sizes.fixPadding + 5.0,
        marginBottom: Sizes.fixPadding + 5.0,
    },
    storeCardSelected: {
        borderColor: Colors.blackColor,
        backgroundColor: Colors.offWhiteColor,
    },
    primaryBadge: {
        backgroundColor: Colors.primaryColor,
        paddingHorizontal: Sizes.fixPadding,
        paddingVertical: 2,
        borderRadius: 4,
    },
    dateCard: {
        width: 65,
        alignItems: 'center',
        padding: Sizes.fixPadding,
        borderWidth: 1.5,
        borderColor: Colors.offWhiteColor,
        borderRadius: Sizes.fixPadding,
        marginRight: Sizes.fixPadding,
    },
    dateCardSelected: {
        borderColor: Colors.blackColor,
        backgroundColor: Colors.blackColor,
    },
    dayText: {
        ...Fonts.grayColor12Regular,
    },
    dateText: {
        ...Fonts.blackColor18SemiBold,
        marginVertical: 2,
    },
    monthText: {
        ...Fonts.grayColor12Regular,
    },
    selectedText: {
        color: Colors.whiteColor,
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
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: Colors.offWhiteColor,
        padding: Sizes.fixPadding,
        borderRadius: Sizes.fixPadding,
        marginBottom: Sizes.fixPadding,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Sizes.fixPadding - 5.0,
    },
    errorText: {
        ...Fonts.grayColor15Regular,
        color: Colors.redColor,
        textAlign: 'center',
    },
})
