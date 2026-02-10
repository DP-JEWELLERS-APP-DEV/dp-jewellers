import { StyleSheet, Text, View, Image, TextInput, ScrollView, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { Colors, Fonts, Sizes, Screen } from '../../../constants/styles'
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../../../lib/firebase';

const popularSearches = [
    'Bracelets', 'Charms', 'Rings', 'Body Jewelry', 'Anklets', 'Necklace'
];

// No static recent searches - will be populated by user actions
const recentSearchesList = [];

const placeholderImage = require('../../../assets/images/jewellery/jewellary1.png');

const SearchScreen = () => {

    const navigation = useNavigation();
    const params = useLocalSearchParams();

    const [search, setsearch] = useState('');
    const [recentSearches, setrecentSearches] = useState(recentSearchesList);
    const [results, setresults] = useState([]);
    const [loading, setloading] = useState(false);
    const [errorText, seterrorText] = useState('');
    const [filters, setfilters] = useState({
        material: '',
        purity: '',
        goldColor: '',
        diamond: '',
        minPrice: '',
        maxPrice: '',
    });
    const lastTrackedSearchRef = useRef('');

    useEffect(() => {
        const material = params?.material ? String(params.material) : '';
        const purity = params?.purity ? String(params.purity) : '';
        const goldColor = params?.goldColor ? String(params.goldColor) : '';
        const diamond = params?.diamond ? String(params.diamond) : '';
        const minPrice = params?.minPrice ? String(params.minPrice) : '';
        const maxPrice = params?.maxPrice ? String(params.maxPrice) : '';
        setfilters({ material, purity, goldColor, diamond, minPrice, maxPrice });
    }, [params?.material, params?.purity, params?.goldColor, params?.diamond, params?.minPrice, params?.maxPrice]);

    useEffect(() => {
        let active = true;
        const runSearch = async () => {
            const hasQuery = search.trim().length > 0;
            const hasFilter = Boolean(filters.material || filters.purity || filters.goldColor || filters.diamond || filters.minPrice || filters.maxPrice);
            if (!hasQuery && !hasFilter) {
                setresults([]);
                setloading(false);
                seterrorText('');
                return;
            }
            setloading(true);
            seterrorText('');
            try {
                const searchProducts = httpsCallable(functions, 'searchProducts');
                const res = await searchProducts({
                    query: search.trim() || undefined,
                    material: filters.material || undefined,
                    purity: filters.purity || undefined,
                    goldColor: filters.goldColor || undefined,
                    diamond: filters.diamond || undefined,
                    minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
                    maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
                });
                if (active) {
                    setresults(res?.data?.products || []);
                    const normalized = search.trim().toLowerCase();
                    if (normalized && normalized.length >= 2 && auth?.currentUser && normalized !== lastTrackedSearchRef.current) {
                        lastTrackedSearchRef.current = normalized;
                        const trackUserActivity = httpsCallable(functions, 'trackUserActivity');
                        trackUserActivity({ type: 'search', term: normalized }).catch(() => {
                            // Ignore tracking errors
                        });
                    }
                }
            } catch (err) {
                if (active) {
                    seterrorText('Failed to load results.');
                    setresults([]);
                }
            } finally {
                if (active) setloading(false);
            }
        };
        runSearch();
        return () => { active = false; };
    }, [search, filters.material, filters.purity, filters.goldColor, filters.diamond, filters.minPrice, filters.maxPrice]);

    const hasQuery = search.trim().length > 0;
    const hasFilter = Boolean(filters.material || filters.purity || filters.goldColor || filters.diamond || filters.minPrice || filters.maxPrice);

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <View style={{ flex: 1 }}>
                {searchBarWithFilterIcon()}
                {loading ? (
                    <View style={styles.centerWrap}>
                        <ActivityIndicator color={Colors.primaryColor} />
                    </View>
                ) : errorText ? (
                    <View style={styles.centerWrap}>
                        <Text style={styles.errorText}>{errorText}</Text>
                    </View>
                ) : results.length > 0 ? (
                    resultsList()
                ) : (hasQuery || hasFilter) ? (
                    <View style={styles.centerWrap}>
                        <Text style={{ ...Fonts.lightGrayColor18SemiBold, color: Colors.lightGrayColor }}>
                            No products found
                        </Text>
                    </View>
                ) : (
                    <ScrollView
                        automaticallyAdjustKeyboardInsets={true}
                        showsVerticalScrollIndicator={false}
                    >
                        {popularSearchesInfo()}
                        {recentSearches.length == 0 ? null : recentSearchesInfo()}
                    </ScrollView>
                )}
            </View>
        </View>
    )

    function resultsList() {
        const renderItem = ({ item }) => (
            <TouchableOpacity
                activeOpacity={0.5}
                onPress={() => { navigation.push('productDetail/productDetailScreen', { productId: item.productId }) }}
                style={{ ...styles.recommendedItemWrapStyle, flex: 1, }}
            >
                <Image
                    source={item.image ? { uri: item.image } : placeholderImage}
                    style={styles.productImageStyle}
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
            <View style={{ marginVertical: Sizes.fixPadding * 2.0 }}>
                <Text style={{ marginHorizontal: Sizes.fixPadding * 2.0, ...Fonts.blackColor18SemiBold }}>
                    Results
                </Text>
                <FlatList
                    data={results}
                    keyExtractor={(item) => `${item.productId}`}
                    renderItem={renderItem}
                    numColumns={2}
                    contentContainerStyle={{ paddingHorizontal: Sizes.fixPadding, paddingTop: Sizes.fixPadding + 3.0 }}
                    showsHorizontalScrollIndicator={false}
                />
            </View>
        )
    }

    function removeRecentSearch({ id }) {
        const copySearches = recentSearches;
        const newSearches = copySearches.filter((item) => item.id != id);
        setrecentSearches(newSearches)
    }

    function recentSearchesInfo() {
        return (
            <View style={{ marginTop: Sizes.fixPadding * 2.0, }}>
                <View style={styles.recentSearchesTitleWrapStyle}>
                    <Text numberOfLines={1} style={{ flex: 1, ...Fonts.primaryColor14Medium }}>
                        RECENT SEARCHES
                    </Text>
                    <Text onPress={() => { setrecentSearches([]) }} style={{ ...Fonts.grayColor14Medium }}>
                        Clear all
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: Sizes.fixPadding + 5.0, }}>
                    {
                        recentSearches.map((item, index) => (
                            <View
                                key={`${index}`}
                                style={{ ...styles.searchesWrapStyle, flexDirection: 'row', alignItems: 'center' }}
                            >
                                <Text
                                    style={{ ...Fonts.blackColor15Regular }}
                                    onPress={() => { setsearch(item.search) }}
                                >
                                    {item.search}
                                </Text>
                                <MaterialIcons
                                    name="close"
                                    size={16}
                                    color={Colors.blackColor}
                                    style={{ marginLeft: Sizes.fixPadding - 5.0 }}
                                    onPress={() => { removeRecentSearch({ id: item.id }) }}
                                />
                            </View>
                        ))
                    }
                </View>
            </View>
        )
    }

    function popularSearchesInfo() {
        return (
            <View style={{ marginTop: Sizes.fixPadding * 3.0 }}>
                <Text style={{ marginHorizontal: Sizes.fixPadding * 2.0, ...Fonts.primaryColor14Medium, marginBottom: Sizes.fixPadding }}>
                    POPULAR SEARCHES
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: Sizes.fixPadding + 5.0, }}>
                    {
                        popularSearches.map((item, index) => (
                            <View
                                key={`${index}`}
                                style={styles.searchesWrapStyle}
                            >
                                <Text
                                    style={{ ...Fonts.blackColor15Regular }}
                                    onPress={() => { setsearch(item) }}
                                >
                                    {item}
                                </Text>
                            </View>
                        ))
                    }
                </View>
            </View>
        )
    }

    function searchBarWithFilterIcon() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginTop: Sizes.fixPadding * 2.0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Feather name="search" size={18} color={Colors.blackColor} />
                    <TextInput
                        placeholder='Search'
                        placeholderTextColor={Colors.grayColor}
                        style={{ padding: 0, ...Fonts.blackColor16Regular, flex: 1, marginHorizontal: Sizes.fixPadding }}
                        value={search}
                        onChangeText={(newVal) => { setsearch(newVal) }}
                        cursorColor={Colors.primaryColor}
                        selectionColor={Colors.primaryColor}
                        numberOfLines={1}
                    />
                    <Feather
                        name="sliders"
                        size={18}
                        color={Colors.blackColor}
                        onPress={() => {
                            navigation.push('filter/filterScreen', {
                                material: filters.material || '',
                                purity: filters.purity || '',
                                goldColor: filters.goldColor || '',
                                diamond: filters.diamond || '',
                                minPrice: filters.minPrice || '',
                                maxPrice: filters.maxPrice || '',
                            })
                        }}
                    />
                </View>
                <View style={{ backgroundColor: Colors.lightGrayColor, height: 1.0, marginTop: Sizes.fixPadding }} />
            </View>
        )
    }
}

export default SearchScreen

const styles = StyleSheet.create({
    searchesWrapStyle: {
        borderColor: Colors.offWhiteColor,
        marginHorizontal: Sizes.fixPadding - 5.0,
        marginBottom: Sizes.fixPadding,
        borderWidth: 1.0,
        borderRadius: Sizes.fixPadding - 5.0,
        paddingHorizontal: Sizes.fixPadding * 2.0,
        paddingVertical: Sizes.fixPadding - 5.0,
    },
    recentSearchesTitleWrapStyle: {
        marginHorizontal: Sizes.fixPadding * 2.0,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Sizes.fixPadding
    },
    productImageStyle: {
        alignSelf: 'center',
        width: Screen.width / 3.5,
        height: Screen.width / 3.5,
        resizeMode: 'contain',
        margin: Sizes.fixPadding + 5.0,
    },
    recommendedItemWrapStyle: {
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
