import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Colors, Fonts, Sizes, Screen, CommomStyles } from '../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons';
import MyStatusBar from '../../components/myStatusBar';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';

const placeholderImage = require('../../assets/images/jewellery/jewellary1.png');

const CategoryWiseProductsScreen = () => {

    const navigation = useNavigation();
    const { category } = useLocalSearchParams();
    const categoryName = category ? String(category) : 'Rings';

    const [items, setitems] = useState([]);
    const [loading, setloading] = useState(true);
    const [errorText, seterrorText] = useState('');

    useEffect(() => {
        let active = true;
        const fetchProducts = async () => {
            setloading(true);
            seterrorText('');
            try {
                const getProductsByCategory = httpsCallable(functions, 'getProductsByCategory');
                const res = await getProductsByCategory({ category: categoryName });
                const products = res?.data?.products || [];
                if (active) {
                    setitems(products);
                }
            } catch (err) {
                if (active) {
                    seterrorText('Failed to load products.');
                    setitems([]);
                }
            } finally {
                if (active) setloading(false);
            }
        };
        fetchProducts();
        return () => { active = false; };
    }, [categoryName]);

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
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
                ) : (
                    itemsListInfo()
                )}
            </View>
        </View>
    )

    function itemsListInfo() {
        const renderItem = ({ item }) => (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { navigation.push('productDetail/productDetailScreen', { productId: item.productId }) }}
                style={{ flex: 1, marginBottom: Sizes.fixPadding * 2.0, ...styles.productWrapStyle, }}
            >
                <Image
                    source={item.image ? { uri: item.image } : placeholderImage}
                    style={styles.productImageStyle}
                />
                <View style={{ backgroundColor: Colors.offWhiteColor, height: 1.0, }} />
                <View style={{ margin: Sizes.fixPadding + 5.0 }}>
                    <Text numberOfLines={1} style={{ ...Fonts.blackColor16Regular, lineHeight: 22.0, }}>
                        {item.name}
                    </Text>
                    <Text numberOfLines={1} style={{ ...Fonts.blackColor16SemiBold, lineHeight: 22.0, }}>
                        {`₹`}{Number(item.finalPrice || 0).toFixed(2)}
                    </Text>
                </View>
            </TouchableOpacity>
        )
        return (
            <FlatList
                data={items}
                keyExtractor={(item) => `${item.productId}`}
                renderItem={renderItem}
                numColumns={2}
                contentContainerStyle={{ paddingHorizontal: Sizes.fixPadding, paddingTop: Sizes.fixPadding * 2.0, }}
                showsVerticalScrollIndicator={false}
            />
        )
    }

    function header() {
        return (
            <View style={CommomStyles.headerStyle}>
                <Image source={require('../../assets/images/dp-logo-01.png')} style={CommomStyles.headerLogo} />
                <MaterialIcons name="keyboard-backspace" size={26} color={Colors.blackColor} onPress={() => { navigation.pop() }} />
                <Text style={{ ...Fonts.blackColor20SemiBold, marginLeft: Sizes.fixPadding * 2.0, }}>
                    {categoryName}
                </Text>
            </View>
        )
    }
}

export default CategoryWiseProductsScreen

const styles = StyleSheet.create({
    productWrapStyle: {
        borderColor: Colors.offWhiteColor,
        borderWidth: 1.0,
        borderRadius: Sizes.fixPadding,
        marginHorizontal: Sizes.fixPadding,
        maxWidth: (Screen.width / 2.0) - 30
    },
    productImageStyle: {
        alignSelf: 'center',
        width: Screen.width / 3.5,
        height: Screen.width / 3.5,
        resizeMode: 'contain',
        margin: Sizes.fixPadding + 5.0,
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
