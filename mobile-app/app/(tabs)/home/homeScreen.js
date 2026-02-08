import { StyleSheet, Text, View, Image, FlatList, TouchableOpacity, ImageBackground, ActivityIndicator, DeviceEventEmitter } from 'react-native'
import React, { useEffect, useState, useCallback } from 'react'
import { Colors, CommomStyles, Fonts, Sizes, Screen } from '../../../constants/styles'
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRouter, useFocusEffect } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../../../lib/firebase';
import { Snackbar } from 'react-native-paper';
import ProductCard from '../../../components/ProductCard';

const placeholderImage = require('../../../assets/images/jewellery/jewellary1.png');
const categoryImageMap = {
    Ring: require('../../../assets/images/ring.jpg'),
    Necklace: require('../../../assets/images/neclace.jpg'),
    Earring: require('../../../assets/images/earring.jpg'),
    Bangle: require('../../../assets/images/bangle.jpg'),
    Bracelet: require('../../../assets/images/bracelet.jpg'),
    Pendant: require('../../../assets/images/pendant.jpg'),
    Chain: require('../../../assets/images/chain.jpg'),
    Anklet: require('../../../assets/images/anklet.jpeg'),
    Mangalsutra: require('../../../assets/images/mangalsutra.webp'),
    Kada: require('../../../assets/images/kada.jpg'),
    Nosering: require('../../../assets/images/nosering.jpg'),
};

const HomeScreen = () => {

    const navigation = useNavigation();
    const router = useRouter();
    const [categories, setcategories] = useState([]);
    const [featured, setfeatured] = useState([]);
    const [popular, setpopular] = useState([]);
    const [bannerData, setBannerData] = useState([]);
    const [loading, setloading] = useState(true);
    const [errorText, seterrorText] = useState('');
    const [showSnackBar, setShowSnackBar] = useState(false);
    const [snackText, setSnackText] = useState('');
    const [favoriteIds, setFavoriteIds] = useState([]);

    console.log("categories",bannerData);

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
                setBannerData(res?.data?.banners || []);
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

    // Fetch favorites when screen is focused to ensure heart icons are up-to-date
    useFocusEffect(
        useCallback(() => {
            const fetchFavorites = async () => {
                if (!auth?.currentUser) {
                    setFavoriteIds([]);
                    return;
                }
                try {
                    const getFavorites = httpsCallable(functions, 'getFavorites');
                    const res = await getFavorites();
                    const favList = res?.data?.favorites || [];
                    setFavoriteIds(favList.map(f => String(f.productId)));
                } catch (err) {
                    // Ignore error
                }
            };
            fetchFavorites();
        }, [])
    );

    // Refresh favorites when they change elsewhere (e.g., wishlist screen)
    useEffect(() => {
        const favSub = DeviceEventEmitter.addListener('favoritesUpdated', () => {
            if (auth?.currentUser) {
                const getFavorites = httpsCallable(functions, 'getFavorites');
                getFavorites()
                    .then((res) => {
                        const favList = res?.data?.favorites || [];
                        setFavoriteIds(favList.map(f => String(f.productId)));
                    })
                    .catch(() => {
                        // Ignore error
                    });
            } else {
                setFavoriteIds([]);
            }
        });

        return () => {
            favSub.remove();
        };
    }, []);

    // Add isFavorite property to products
    const addFavoriteStatus = (products) => {
        return products.map(product => ({
            ...product,
            isFavorite: favoriteIds.includes(String(product.productId))
        }));
    };

    const handleShowSnackBar = (text) => {
        setSnackText(text);
        setShowSnackBar(true);
    };

    const handleFavoriteChange = (isFavorite, productId) => {
        if (isFavorite) {
            setFavoriteIds(prev => [...prev, String(productId)]);
        } else {
            setFavoriteIds(prev => prev.filter(id => id !== String(productId)));
        }
    };

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
            {snackBar()}
        </View>
    )

    function snackBar() {
        return (
            <Snackbar
                visible={showSnackBar}
                onDismiss={() => setShowSnackBar(false)}
                duration={2000}
                elevation={0.0}
                style={CommomStyles.snackBarStyle}
            >
                <Text style={{ ...Fonts.whiteColor16Medium }}>
                    {snackText}
                </Text>
            </Snackbar>
        )
    }

    function popularInfo() {
        const productsWithFavorites = addFavoriteStatus(popular);
        return (
            <View style={{ marginTop: Sizes.fixPadding, marginHorizontal: Sizes.fixPadding }}>
                <Text style={{ marginHorizontal: Sizes.fixPadding, ...Fonts.blackColor18SemiBold, marginBottom: Sizes.fixPadding + 3.0 }}>
                    Popular
                </Text>
                <FlatList
                    data={productsWithFavorites}
                    keyExtractor={(item) => `${item.productId}`}
                    renderItem={({ item }) => (
                        <ProductCard
                            item={item}
                            showSnackBar={handleShowSnackBar}
                            onFavoriteChange={handleFavoriteChange}
                        />
                    )}
                    numColumns={2}
                    scrollEnabled={false}
                />
            </View>
        )
    }

    function recommendedInfo() {
        const productsWithFavorites = addFavoriteStatus(featured);
        return (
            <View style={{ marginVertical: Sizes.fixPadding * 2.0, }}>
                <Text style={{ marginHorizontal: Sizes.fixPadding * 2.0, ...Fonts.blackColor18SemiBold }}>
                    Recommended for You
                </Text>
                <FlatList
                    data={productsWithFavorites}
                    keyExtractor={(item) => `${item.productId}`}
                    renderItem={({ item }) => (
                        <ProductCard
                            item={item}
                            horizontal
                            showSnackBar={handleShowSnackBar}
                            onFavoriteChange={handleFavoriteChange}
                        />
                    )}
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
                    source={categoryImageMap[item] || placeholderImage}
                    style={{ width: Screen.width / 4.5, height: Screen.width / 4.5, resizeMode: 'cover' }}
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
        if (!bannerData || bannerData.length === 0) return null;
        const handleBannerPress = (item) => {
            if (item.linkType === 'category' && item.linkTarget) {
                navigation.push('categoryWiseProducts/categoryWiseProductsScreen', { category: item.linkTarget });
            } else {
                navigation.navigate('search/searchScreen');
            }
        };
        const renderItem = ({ item }) => (
            <ImageBackground
                source={{ uri: item.imageUrl }}
                style={{ width: Screen.width - 60, height: 155.0, marginHorizontal: Sizes.fixPadding, }}
                borderRadius={Sizes.fixPadding}
            >
                <View style={{ backgroundColor: 'rgba(255,255,255,0.20)', flex: 1, padding: Sizes.fixPadding * 2.0 }}>
                    <Text
                        numberOfLines={2}
                        style={{ ...Fonts.whiteColor22Bold, lineHeight: 26.0, paddingTop: Sizes.fixPadding - 5.0 }}
                    >
                        {item.title}
                    </Text>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleBannerPress(item)}
                        style={styles.getNowButtonStyle}
                    >
                        <Text style={{ ...Fonts.blackColor15Medium }}>
                            Shop Now
                        </Text>
                    </TouchableOpacity>
                </View>
            </ImageBackground>
        )
        return (
            <View style={{ marginVertical: Sizes.fixPadding * 2.0, }}>
                <FlatList
                    data={bannerData}
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
                <TouchableOpacity onPress={() => router.replace('/(tabs)/home/homeScreen')} activeOpacity={0.7}>
                    <Image source={require('../../../assets/images/dp-logo-02.png')} style={styles.headerLogo} />
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <Feather name="search" size={22} color={Colors.blackColor} onPress={() => { navigation.navigate('search/searchScreen') }} />
            </View>
        )
    }
}

export default HomeScreen

const styles = StyleSheet.create({
    headerLogo: {
        width: Screen.width / 3,
        height: 55,
        resizeMode: 'contain',
    },
    headerWrapStyle: {
        flexDirection: 'row',
        paddingHorizontal: Sizes.fixPadding * 2.0,
        paddingVertical: Sizes.fixPadding,
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
        padding: 0,
        marginHorizontal: Sizes.fixPadding,
        alignItems: 'center',
        overflow: 'hidden',
    },
    categoryWiseJewellaryTextStyle: {
        maxWidth: Screen.width / 4.5,
        textAlign: 'center',
        ...Fonts.blackColor16Medium,
        marginTop: Sizes.fixPadding
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
