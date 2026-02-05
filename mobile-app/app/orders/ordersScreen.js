import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import { Colors, Fonts, Sizes, CommomStyles } from '../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons';
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation } from 'expo-router';

const ordersList = [
    {
        id: '1',
        orderId: 'OD158959',
        orderDate: 'March 2, 2020',
        orderStatus: 'Shipping',
        orderItems: 3,
        totalAmount: 394.75,
    },
    {
        id: '2',
        orderId: 'OD158957',
        orderDate: 'March 5, 2020',
        orderStatus: 'Delivered',
        orderItems: 2,
        totalAmount: 294.50,
    },
    {
        id: '3',
        orderId: 'OD147852',
        orderDate: 'March 10, 2020',
        orderStatus: 'Delivered',
        orderItems: 2,
        totalAmount: 250.00,
    },
];

const OrdersScreen = () => {

    const navigation = useNavigation();

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {header()}
                {ordersInfo()}
            </View>
        </View>
    )

    function ordersInfo() {
        const renderItem = ({ item }) => (
            <TouchableOpacity
                activeOpacity={0.5}
                onPress={() => { navigation.push('orderDetail/orderDetailScreen', { orderStatus: item.orderStatus }) }}
                style={styles.orderInfoWrapStyle}
            >
                <Text style={{ ...Fonts.blackColor18SemiBold }}>
                    {item.orderId}
                </Text>
                <Text style={{ ...Fonts.blackColor15Regular }}>
                    Order at : {item.orderDate}
                </Text>
                <View style={styles.dashedLineStyle} />
                <View style={{ flexDirection: 'row' }}>
                    <Text numberOfLines={1} style={{ ...Fonts.blackColor16Regular, flex: 1 }}>
                        Order Status
                    </Text>
                    <Text style={{ ...Fonts.blackColor16Regular }}>
                        {item.orderStatus}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', marginVertical: Sizes.fixPadding - 7.0 }}>
                    <Text numberOfLines={1} style={{ ...Fonts.blackColor16Regular, flex: 1 }}>
                        Order Items
                    </Text>
                    <Text style={{ ...Fonts.blackColor16Regular }}>
                        {item.orderItems} Items
                    </Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                    <Text numberOfLines={1} style={{ ...Fonts.blackColor16Regular, flex: 1 }}>
                        Total Amount
                    </Text>
                    <Text style={{ ...Fonts.primaryColor16Bold }}>
                        {`$`}{item.totalAmount}
                    </Text>
                </View>
            </TouchableOpacity>
        )
        return (
            <FlatList
                data={ordersList}
                keyExtractor={(item) => `${item.id}`}
                renderItem={renderItem}
                contentContainerStyle={{ paddingTop: Sizes.fixPadding * 2.0, }}
                showsVerticalScrollIndicator={false}
            />
        )
    }

    function header() {
        return (
            <View style={CommomStyles.headerStyle}>
                <Image source={require('../../assets/images/dp-logo-01.png')} style={CommomStyles.headerLogo} />
                <MaterialIcons name="keyboard-backspace" size={26} color={Colors.blackColor} onPress={() => { navigation.pop() }} />
                <Text numberOfLines={1} style={{ ...Fonts.blackColor20SemiBold, marginLeft: Sizes.fixPadding * 2.0, }}>
                    Orders
                </Text>
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
    }
})
