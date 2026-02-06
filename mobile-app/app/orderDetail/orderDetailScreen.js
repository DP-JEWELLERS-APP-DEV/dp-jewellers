import { StyleSheet, Text, View, ScrollView, FlatList, Image, TouchableOpacity } from 'react-native'
import React from 'react'
import { Colors, Fonts, Sizes, CommomStyles, Screen } from '../../constants/styles';
import { MaterialIcons } from '@expo/vector-icons';
import MyStatusBar from '../../components/myStatusBar';
import { useLocalSearchParams, useNavigation } from 'expo-router';

const orderItemsList = [
    {
        id: '1',
        jewelleryImage: require('../../assets/images/jewellery/jewellary1.png'),
        jewelleryName: 'Silver Plated Ring',
        size: 48,
        amount: 120.00,
    },
    {
        id: '2',
        jewelleryImage: require('../../assets/images/jewellery/jewellary10.png'),
        jewelleryName: 'Silver Grace Ring',
        size: 46,
        amount: 125.25,
    },
    {
        id: '3',
        jewelleryImage: require('../../assets/images/jewellery/jewellary3.png'),
        jewelleryName: 'Diamond Earrings',
        size: 'M',
        amount: 149.50,
    },
];

const OrderDetailScreen = () => {

    const navigation = useNavigation();

    const { orderStatus } = useLocalSearchParams();

    const currentOrderStep = orderStatus == 'Packing' ? 1 : orderStatus == 'Shipping' ? 2 : orderStatus == 'Delivered' ? 4 : 3;

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {header()}
                <ScrollView automaticallyAdjustKeyboardInsets={true} showsVerticalScrollIndicator={false}>
                    {orderStatusInfo()}
                    {orderItemsInfo()}
                    {shippingDetailInfo()}
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
                onPress={() => { navigation.push('(tabs)') }}
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
                            $394.75
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
                            $394.75
                        </Text>
                    </View>
                </View>
            </View>
        )
    }

    function shippingDetailInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginVertical: Sizes.fixPadding }}>
                <Text style={{ ...Fonts.blackColor18SemiBold }}>
                    Shipping Details
                </Text>
                <View style={styles.shippingDetailInfoWrapStyle}>
                    <View style={{ flexDirection: 'row', }}>
                        <Text numberOfLines={1} style={{ flex: 1, ...Fonts.grayColor16Regular }}>
                            Shipping Date
                        </Text>
                        <Text style={{ ...Fonts.blackColor16Regular }}>
                            March 10,2020
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', marginTop: Sizes.fixPadding }}>
                        <Text numberOfLines={1} style={{ flex: 1, ...Fonts.grayColor16Regular }}>
                            Address
                        </Text>
                        <Text numberOfLines={2} style={{ maxWidth: Screen.width / 1.7, textAlign: 'right', ...Fonts.blackColor16Regular }}>
                            Kocherstr. 6, Zimmer 773, 25682, Nord Tino, Sachsen-Anhalt, Germany
                        </Text>
                    </View>
                </View>
            </View>
        )
    }

    function orderItemsInfo() {

        const renderItem = ({ item }) => (
            <View style={styles.orderItemWrapStyle}>
                <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}>
                    <View style={styles.jewelleryImageWrapStyle}>
                        <Image
                            source={item.jewelleryImage}
                            style={{ width: '80%', resizeMode: 'contain', height: '80%', }}
                        />
                    </View>
                    <View style={{ flex: 1, marginLeft: Sizes.fixPadding + 3.0, }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Sizes.fixPadding - 13.0, }}>
                            <Text numberOfLines={1} style={{ flex: 1, ...Fonts.blackColor16Regular, marginRight: Sizes.fixPadding - 5.0 }}>
                                {item.jewelleryName}
                            </Text>
                            <Text style={{ ...Fonts.blackColor16Regular }}>
                                {`$`}{item.amount.toFixed(2)}
                            </Text>
                        </View>
                        <Text style={{ ...Fonts.grayColor14Regular, marginTop: -2.0 }}>
                            Size: 48
                        </Text>
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
                        data={orderItemsList}
                        keyExtractor={(item) => `${item.id}`}
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
