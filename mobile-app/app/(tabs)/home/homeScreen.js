import { StyleSheet, Text, View, Image, FlatList, TouchableOpacity, ImageBackground, ActivityIndicator } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Colors, CommomStyles, Fonts, Sizes, Screen } from '../../../constants/styles'
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../lib/firebase';

const bannersList = [
    {
        id: '1',
        bannerHeader: 'Buy Your Elegant\nJewelry',
        bannerImage: require('../../../assets/images/banner/banner.png')
    },
    {
        id: '2',
        bannerHeader: 'Buy Your Elegant\nJewelry',
        bannerImage: require('../../../assets/images/banner/banner.png')
    },
];

const placeholderImage = require('../../../assets/images/jewellery/jewellary1.png');

const HomeScreen = () => {

    const navigation = useNavigation();
    const [categories, setcategories] = useState([]);
    const [featured, setfeatured] = useState([]);
    const [popular, setpopular] = useState([]);
    const [loading, setloading] = useState(true);
    const [errorText, seterrorText] = useState('');

    useEffect(() => {
        let active = true;
        const fetchHomeData = async () => {
            setloading(true);
            seterrorText('');
            try {
                const getHomePageData = httpsCallable(functions, 'getHomePageData');
                const res = await getHomePageData();
                if (!active) return;
                setcategories(res?.data?.categories || []);
                setfeatured(res?.data?.featured || []);
                setpopular(res?.data?.popular || []);
            } catch (err) {
                if (active) {
                    seterrorText('Failed to load home data.');
                }
            } finally {
                if (active) setloading(false);
            }
        };
        fetchHomeData();
        return () => { active = false; };
    }, []);

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
                ) : (
                    <FlatList
                        ListHeaderComponent={
                            <>
                                {banners()}
                                {categoryInfo()}
                                {recommendedInfo()}
                                {popularInfo()}
                            </>
                        }
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </View>
    )

    function popularInfo() {
        const renderItem = ({ item }) => (
            <TouchableOpacity
                activeOpacity={0.5}
                onPress={() => { navigation.push('productDetail/productDetailScreen', { productId: item.productId }) }}
                style={{ flex: 1, marginBottom: Sizes.fixPadding * 2.0, ...styles.recommendedAndPopularItemWrapStyle, }}
            >
                <Image
                    source={item.image ? { uri: item.image } : placeholderImage}
                    style={styles.recommendedAndPopularImageStyle}
                />
                <View style={{ backgroundColor: Colors.offWhiteColor, height: 1.0, }} />
                <View style={{ margin: Sizes.fixPadding + 5.0 }}>
                    <Text numberOfLines={1} style={{ ...Fonts.blackColor16Regular }}>
                        {item.name}
                    </Text>
                    <Text numberOfLines={1} style={{ ...Fonts.blackColor16SemiBold }}>
                        {`₹`}{Number(item.finalPrice || 0).toFixed(2)}
                    </Text>
                </View>
            </TouchableOpacity>
        )
        return (
            <View style={{ marginTop: Sizes.fixPadding, marginHorizontal: Sizes.fixPadding }}>
                <Text style={{ marginHorizontal: Sizes.fixPadding, ...Fonts.blackColor18SemiBold, marginBottom: Sizes.fixPadding + 3.0 }}>
                    Popular
                </Text>
                <FlatList
                    data={popular}
                    keyExtractor={(item) => `${item.productId}`}
                    renderItem={renderItem}
                    numColumns={2}
                    scrollEnabled={false}
                />
            </View>
        )
    }

    function recommendedInfo() {
        const renderItem = ({ item }) => (
            <TouchableOpacity
                activeOpacity={0.5}
                onPress={() => { navigation.push('productDetail/productDetailScreen', { productId: item.productId }) }}
                style={{ ...styles.recommendedAndPopularItemWrapStyle, width: Screen.width / 2.4, }}
            >
                <Image
                    source={item.image ? { uri: item.image } : placeholderImage}
                    style={styles.recommendedAndPopularImageStyle}
                />
                <View style={{ backgroundColor: Colors.offWhiteColor, height: 1.0, }} />
                <View style={{ margin: Sizes.fixPadding + 5.0 }}>
                    <Text numberOfLines={1} style={{ ...Fonts.blackColor16Regular }}>
                        {item.name}
                    </Text>
                    <Text numberOfLines={1} style={{ ...Fonts.blackColor16SemiBold }}>
                        {`₹`}{Number(item.finalPrice || 0).toFixed(2)}
                    </Text>
                </View>
            </TouchableOpacity>
        )
        return (
            <View style={{ marginVertical: Sizes.fixPadding * 2.0, }}>
                <Text style={{ marginHorizontal: Sizes.fixPadding * 2.0, ...Fonts.blackColor18SemiBold }}>
                    Recommended for You
                </Text>
                <FlatList
                    data={featured}
                    keyExtractor={(item) => `${item.productId}`}
                    renderItem={renderItem}
                    horizontal
                    contentContainerStyle={{ paddingHorizontal: Sizes.fixPadding, paddingTop: Sizes.fixPadding + 3.0 }}
                    showsHorizontalScrollIndicator={false}
                />
            </View>
        )
    }

    function categoryInfo() {
        const renderItem = ({ item }) => (
            <TouchableOpacity
                activeOpacity={0.5}
                onPress={() => { navigation.push('categoryWiseProducts/categoryWiseProductsScreen', { category: item }) }}
                style={styles.categoryWiseItemWrapStyle}
            >
                <Image
                    source={placeholderImage}
                    style={{ width: Screen.width / 4.5, height: Screen.width / 4.5, resizeMode: 'contain' }}
                />
                <Text numberOfLines={1} style={styles.categoryWiseJewellaryTextStyle}>
                    {item}
                </Text>
            </TouchableOpacity>
        )
        return (
            <View style={{ marginVertical: Sizes.fixPadding }}>
                <Text style={{ marginHorizontal: Sizes.fixPadding * 2.0, ...Fonts.blackColor18SemiBold }}>
                    Category
                </Text>
                <FlatList
                    data={categories}
                    keyExtractor={(item, index) => `${item}-${index}`}
                    renderItem={renderItem}
                    horizontal
                    contentContainerStyle={{ paddingHorizontal: Sizes.fixPadding, paddingTop: Sizes.fixPadding + 3.0 }}
                    showsHorizontalScrollIndicator={false}
                />
            </View>
        )
    }

    function banners() {
        const renderItem = ({ item }) => (
            <ImageBackground
                source={item.bannerImage}
                style={{ width: Screen.width - 60, height: 155.0, marginHorizontal: Sizes.fixPadding, }}
                borderRadius={Sizes.fixPadding}
            >
                <View style={{ backgroundColor: 'rgba(255,255,255,0.20)', flex: 1, padding: Sizes.fixPadding * 2.0 }}>
                    <Text
                        numberOfLines={2}
                        style={{ ...Fonts.whiteColor22Bold, lineHeight: 26.0, paddingTop: Sizes.fixPadding - 5.0 }}
                    >
                        {item.bannerHeader}
                    </Text>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => { }}
                        style={styles.getNowButtonStyle}
                    >
                        <Text style={{ ...Fonts.blackColor15Medium }}>
                            Get Now
                        </Text>
                    </TouchableOpacity>
                </View>
            </ImageBackground>
        )
        return (
            <View style={{ marginVertical: Sizes.fixPadding * 2.0, }}>
                <FlatList
                    data={bannersList}
                    keyExtractor={(item) => `${item.id}`}
                    renderItem={renderItem}
                    horizontal
                    contentContainerStyle={{ paddingHorizontal: Sizes.fixPadding, }}
                    showsHorizontalScrollIndicator={false}
                />
            </View>
        )
    }

    function header() {
        return (
            <View style={styles.headerWrapStyle}>
                <Image source={require('../../../assets/images/dp-logo-01.png')} style={CommomStyles.headerLogo} />
                <MaterialCommunityIcons name="sort-variant" size={22} color={Colors.blackColor} onPress={() => { }} />
                <Text
                    numberOfLines={1}
                    style={styles.headerTextStyle}
                >
                    Featured
                </Text>
                <Feather name="search" size={19} color={Colors.blackColor} onPress={() => { navigation.navigate('search/searchScreen') }} />
            </View>
        )
    }
}

export default HomeScreen

const styles = StyleSheet.create({
    headerTextStyle: {
        marginHorizontal: Sizes.fixPadding + 5.0,
        flex: 1,
        textAlign: 'center',
        ...Fonts.blackColor20SemiBold
    },
    headerWrapStyle: {
        flexDirection: 'row',
        padding: Sizes.fixPadding * 2.0,
        alignItems: 'center',
        borderBottomColor: Colors.offWhiteColor,
        borderBottomWidth: 1.0
    },
    getNowButtonStyle: {
        backgroundColor: Colors.whiteColor,
        paddingVertical: Sizes.fixPadding - 5.0,
        paddingHorizontal: Sizes.fixPadding * 2.0,
        borderRadius: Sizes.fixPadding - 5.0,
        alignSelf: 'flex-start',
        marginTop: Sizes.fixPadding * 1.5,
    },
    categoryWiseItemWrapStyle: {
        borderColor: Colors.offWhiteColor,
        borderWidth: 1.0,
        borderRadius: Sizes.fixPadding,
        padding: Sizes.fixPadding + 5.0,
        marginHorizontal: Sizes.fixPadding,
        alignItems: 'center',
    },
    categoryWiseJewellaryTextStyle: {
        maxWidth: Screen.width / 4.5,
        textAlign: 'center',
        ...Fonts.blackColor16Medium,
        marginTop: Sizes.fixPadding
    },
    recommendedAndPopularImageStyle: {
        alignSelf: 'center',
        width: Screen.width / 3.5,
        height: Screen.width / 3.5,
        resizeMode: 'contain',
        margin: Sizes.fixPadding + 5.0,
    },
    recommendedAndPopularItemWrapStyle: {
        borderColor: Colors.offWhiteColor,
        borderWidth: 1.0,
        borderRadius: Sizes.fixPadding,
        marginHorizontal: Sizes.fixPadding,
        maxWidth: (Screen.width / 2.0) - 30
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
