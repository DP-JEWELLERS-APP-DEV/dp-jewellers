import { StyleSheet, Text, View, Image, FlatList, TouchableOpacity, ImageBackground, ActivityIndicator, DeviceEventEmitter } from 'react-native'
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Colors, CommomStyles, Fonts, Sizes, Screen } from '../../../constants/styles'
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRouter, useFocusEffect } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../../../lib/firebase';
import { Snackbar } from 'react-native-paper';
import ProductCard from '../../../components/ProductCard';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const HOME_CACHE_KEY = 'home_cache_v1';

const HomeScreen = () => {

    const navigation = useNavigation();
    const router = useRouter();
    const [categories, setcategories] = useState([]);
    const [featured, setfeatured] = useState([]);
    const [recommended, setrecommended] = useState([]);
    const [popular, setpopular] = useState([]);
    const [bannerData, setBannerData] = useState([]);
    const [customCollections, setCustomCollections] = useState([]);
    const [loading, setloading] = useState(true);
    const [errorText, seterrorText] = useState('');
    const [showSnackBar, setShowSnackBar] = useState(false);
    const [snackText, setSnackText] = useState('');
    const [favoriteIds, setFavoriteIds] = useState([]);
    const [hasCachedData, setHasCachedData] = useState(false);

    const flatListRef = useRef(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems && viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    useEffect(() => {
        if (!bannerData || bannerData.length === 0) return;

        const interval = setInterval(() => {
            setCurrentIndex(prev => {
                const next = (prev + 1) % bannerData.length;
                flatListRef.current?.scrollToIndex({ index: next, animated: true });
                return next;
            });
        }, 3000);

        return () => clearInterval(interval);
    }, [bannerData.length]);

    const applyHomeData = (data) => {
        const nextCategories = data?.categories || [];
        const apiFeatured = data?.featured || [];
        setcategories(nextCategories);
        setfeatured(apiFeatured);
        setrecommended(data?.recommended || apiFeatured);
        setpopular(data?.popular || []);
        setBannerData(data?.banners || []);
        setCustomCollections(data?.customCollections || []);
    };

    const loadCachedHomeData = async () => {
        try {
            const cached = await AsyncStorage.getItem(HOME_CACHE_KEY);
            if (!cached) return false;
            const parsed = JSON.parse(cached);
            if (!parsed || typeof parsed !== 'object') return false;
            applyHomeData(parsed);
            setHasCachedData(true);
            return true;
        } catch (err) {
            return false;
        }
    };

    const persistHomeData = async (data) => {
        try {
            await AsyncStorage.setItem(HOME_CACHE_KEY, JSON.stringify({
                categories: data?.categories || [],
                featured: data?.featured || [],
                recommended: data?.recommended || [],
                popular: data?.popular || [],
                banners: data?.banners || [],
                customCollections: data?.customCollections || [],
                cachedAt: Date.now(),
            }));
        } catch (err) {
            // Ignore cache write errors
        }
    };

    useEffect(() => {
        let active = true;
        const fetchHomeData = async () => {
            setloading(true);
            seterrorText('');
            try {
                const getHomePageData = httpsCallable(functions, 'getHomePageData');
                const res = await getHomePageData();
                if (!active) return;
                applyHomeData(res?.data || {});
                setHasCachedData(true);
                await persistHomeData(res?.data || {});
            } catch (err) {
                if (active) {
                    const loaded = await loadCachedHomeData();
                    if (loaded) {
                        handleShowSnackBar('Showing saved data (offline).');
                        seterrorText('');
                    } else {
                        seterrorText('Failed to load home data.');
                    }
                }
            } finally {
                if (active) setloading(false);
            }
        };

        (async () => {
            await loadCachedHomeData();
            if (active) {
                fetchHomeData();
            }
        })();

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
                {loading && !hasCachedData ? (
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
                                {signatureInfo()}
                                {recommendedForYouInfo()}
                                {customCollections.map((col) => customCollectionSection(col))}
                                {popularInfo()}
                            </>
                        }
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 100 }}
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

    function uniqueByProductId(items, excludeIds = new Set()) {
        const seen = new Set(excludeIds);
        const result = [];
        items.forEach((item) => {
            const id = String(item?.productId || '');
            if (!id || seen.has(id)) return;
            seen.add(id);
            result.push(item);
        });
        return result;
    }

    function signatureInfo() {
        if (!featured || featured.length === 0) return null;
        const productsWithFavorites = addFavoriteStatus(featured);
        return (
            <View style={{ marginTop: Sizes.fixPadding, marginBottom: Sizes.fixPadding / 2.0 }}>
                <View style={{ width: '100%', paddingHorizontal: Sizes.fixPadding, alignItems: 'center', marginBottom: Sizes.fixPadding }}>
                    <Text style={{ ...Fonts.blackColor18SemiBold, fontSize: 19.0, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2.0, textAlign: 'center' }}>
                        DP SIGNATURE
                    </Text>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={{ ...Fonts.blackColor14Medium, fontSize: 12.0, lineHeight: 18.0, textAlign: 'center', fontStyle: 'italic', letterSpacing: 0.2, marginBottom: 5.0, width: '90%' }}>
                        Handpicked designs for your unique glow
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '75%', marginTop: 2.0 }}>
                        <View style={{ flex: 1, height: 1.5, backgroundColor: '#9E9E9E' }} />
                        <Image
                            source={require('../../../assets/images/icon.png')}
                            style={{ width: 35.0, height: 35.0, resizeMode: 'contain', marginHorizontal: Sizes.fixPadding - 5.0 }}
                        />
                        <View style={{ flex: 1, height: 1.5, backgroundColor: '#9E9E9E' }} />
                    </View>
                </View>
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
                    contentContainerStyle={{ paddingHorizontal: Sizes.fixPadding, paddingTop: Sizes.fixPadding }}
                    showsHorizontalScrollIndicator={false}
                />
            </View>
        )
    }

    function customCollectionSection(collection) {
        const productsWithFavorites = addFavoriteStatus(collection.products || []);
        if (productsWithFavorites.length === 0) return null;
        return (
            <View key={collection.id} style={{ marginTop: Sizes.fixPadding, marginBottom: Sizes.fixPadding / 2.0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Sizes.fixPadding * 2.0, marginBottom: Sizes.fixPadding }}>
                    <Text style={{ ...Fonts.blackColor18SemiBold }}>{collection.name}</Text>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => navigation.push('categoryWiseProducts/categoryWiseProductsScreen', { collectionId: collection.id, collectionName: collection.name })}
                    >
                        <Text style={{ ...Fonts.blackColor15Medium, color: Colors.primaryColor }}>Shop All</Text>
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={productsWithFavorites}
                    keyExtractor={(item) => `cc-${collection.id}-${item.productId}`}
                    renderItem={({ item }) => (
                        <ProductCard
                            item={item}
                            horizontal
                            showSnackBar={handleShowSnackBar}
                            onFavoriteChange={handleFavoriteChange}
                        />
                    )}
                    horizontal
                    contentContainerStyle={{ paddingHorizontal: Sizes.fixPadding }}
                    showsHorizontalScrollIndicator={false}
                />
            </View>
        );
    }

    function recommendedForYouInfo() {
        const excludeIds = new Set((featured || []).map((item) => String(item?.productId || '')));
        const recommendedSource = uniqueByProductId(recommended || [], excludeIds);
        const fallbackSource = uniqueByProductId(popular || [], excludeIds);
        const dataSource = recommendedSource.length > 0 ? recommendedSource : fallbackSource;
        if (!dataSource || dataSource.length === 0) return null;
        const productsWithFavorites = addFavoriteStatus(dataSource);
        return (
            <View style={{ marginTop: Sizes.fixPadding, marginBottom: Sizes.fixPadding / 2.0 }}>
                <View style={{ paddingHorizontal: Sizes.fixPadding, marginBottom: Sizes.fixPadding }}>
                    <Text style={{ ...Fonts.blackColor18SemiBold, marginBottom: 2.0 }}>
                        Recommended For You
                    </Text>

                </View>
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
                    contentContainerStyle={{ paddingHorizontal: Sizes.fixPadding }}
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
            } else if (item.linkType === 'custom_collection' && item.linkTarget) {
                navigation.push('categoryWiseProducts/categoryWiseProductsScreen', { collectionId: item.linkTarget, collectionName: item.title });
            } else {
                navigation.navigate('search/searchScreen');
            }
        };

        const itemWidth = Screen.width;
        const cardWidth = Screen.width - 40.0;
        const itemHeight = 290.0;

        const renderItem = ({ item }) => (
            <View style={{ width: itemWidth, height: itemHeight, alignItems: 'center' }}>
                <ImageBackground
                    source={{ uri: item.imageUrl }}
                    style={{ width: cardWidth, height: itemHeight }}
                    borderRadius={Sizes.fixPadding}
                >
                    <View style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.35)', // Dark overlay for text visibility
                        borderRadius: Sizes.fixPadding,
                        justifyContent: 'flex-end',
                        paddingHorizontal: Sizes.fixPadding * 2.0,
                        paddingBottom: Sizes.fixPadding * 2.0
                    }}>
                        <Text
                            numberOfLines={2}
                            style={{ ...Fonts.whiteColor22Bold, lineHeight: 30.0, marginBottom: Sizes.fixPadding, textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10 }}
                        >
                            {item.title}
                        </Text>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => handleBannerPress(item)}
                            style={{
                                backgroundColor: Colors.whiteColor,
                                paddingVertical: Sizes.fixPadding - 5.0,
                                paddingHorizontal: Sizes.fixPadding * 2.0,
                                borderRadius: 30.0,
                                alignSelf: 'flex-start',
                                marginBottom: Sizes.fixPadding
                            }}
                        >
                            <Text style={{ ...Fonts.blackColor15Medium, letterSpacing: 0.5 }}>
                                SHOP NOW
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ImageBackground>
            </View>
        )

        return (
            <View>
                <FlatList
                    ref={flatListRef}
                    data={bannerData}
                    keyExtractor={(item) => `${item.id}`}
                    renderItem={renderItem}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={itemWidth}
                    decelerationRate="fast"
                    pagingEnabled
                    snapToAlignment="center"
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                />
                <View style={{ flexDirection: 'row', position: 'absolute', bottom: 10, alignSelf: 'center' }}>
                    {bannerData.map((_, index) => (
                        <View
                            key={index}
                            style={{
                                width: index === currentIndex ? 20.0 : 8.0,
                                height: 8.0,
                                borderRadius: 4.0,
                                backgroundColor: index === currentIndex ? Colors.whiteColor : 'rgba(255, 255, 255, 0.5)',
                                marginHorizontal: 4.0
                            }}
                        />
                    ))}
                </View>
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
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => navigation.push('metalRates/metalRatesScreen')}
                    style={styles.headerPriceBtn}
                >
                    <Text style={styles.headerPriceText}>View Price</Text>
                </TouchableOpacity>
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
    headerPriceBtn: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: Colors.offWhiteColor,
        marginRight: Sizes.fixPadding,
    },
    headerPriceText: {
        ...Fonts.blackColor14Medium,
    },
    getNowButtonStyle: {
        backgroundColor: Colors.whiteColor,
        paddingVertical: Sizes.fixPadding - 5.0,
        paddingHorizontal: Sizes.fixPadding * 2.0,
        borderRadius: Sizes.fixPadding - 5.0,
        alignSelf: 'flex-start',
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
