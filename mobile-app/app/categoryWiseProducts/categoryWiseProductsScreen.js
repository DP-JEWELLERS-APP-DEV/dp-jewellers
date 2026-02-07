import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Colors, Fonts, Sizes, Screen, CommomStyles } from '../../constants/styles'
import { MaterialIcons, Feather } from '@expo/vector-icons';
import MyStatusBar from '../../components/myStatusBar';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';
import { Snackbar } from 'react-native-paper';
import ProductCard from '../../components/ProductCard';

const CategoryWiseProductsScreen = () => {

    const navigation = useNavigation();
    const router = useRouter();
    const params = useLocalSearchParams();
    const categoryName = params?.category ? String(params.category) : 'Rings';

    const [items, setitems] = useState([]);
    const [loading, setloading] = useState(true);
    const [errorText, seterrorText] = useState('');
    const [showSnackBar, setShowSnackBar] = useState(false);
    const [snackText, setSnackText] = useState('');

    // Filter states
    const [filters, setFilters] = useState({
        material: '',
        purity: '',
        goldColor: '',
        diamond: '',
        minPrice: '',
        maxPrice: '',
    });

    // Update filters from params
    useEffect(() => {
        setFilters({
            material: params?.material ? String(params.material) : '',
            purity: params?.purity ? String(params.purity) : '',
            goldColor: params?.goldColor ? String(params.goldColor) : '',
            diamond: params?.diamond ? String(params.diamond) : '',
            minPrice: params?.minPrice ? String(params.minPrice) : '',
            maxPrice: params?.maxPrice ? String(params.maxPrice) : '',
        });
    }, [params?.material, params?.purity, params?.goldColor, params?.diamond, params?.minPrice, params?.maxPrice]);

    useEffect(() => {
        let active = true;
        const fetchProducts = async () => {
            setloading(true);
            seterrorText('');
            try {
                const getProductsByCategory = httpsCallable(functions, 'getProductsByCategory');
                const res = await getProductsByCategory({
                    category: categoryName,
                    material: filters.material || undefined,
                    purity: filters.purity || undefined,
                    goldColor: filters.goldColor || undefined,
                    diamond: filters.diamond || undefined,
                    minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
                    maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
                });
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
    }, [categoryName, filters.material, filters.purity, filters.goldColor, filters.diamond, filters.minPrice, filters.maxPrice]);

    const handleShowSnackBar = (text) => {
        setSnackText(text);
        setShowSnackBar(true);
    };

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
                ) : items.length === 0 ? (
                    <View style={styles.centerWrap}>
                        <Feather name="package" size={40} color={Colors.lightGrayColor} />
                        <Text style={{ ...Fonts.lightGrayColor18SemiBold, marginTop: Sizes.fixPadding }}>
                            No products found
                        </Text>
                    </View>
                ) : (
                    itemsListInfo()
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

    function itemsListInfo() {
        return (
            <FlatList
                data={items}
                keyExtractor={(item) => `${item.productId}`}
                renderItem={({ item }) => (
                    <ProductCard
                        item={item}
                        showSnackBar={handleShowSnackBar}
                    />
                )}
                numColumns={2}
                contentContainerStyle={{ paddingHorizontal: Sizes.fixPadding, paddingTop: Sizes.fixPadding * 2.0 }}
                showsVerticalScrollIndicator={false}
            />
        )
    }

    function header() {
        return (
            <View style={styles.headerStyle}>
                <MaterialIcons
                    name="keyboard-backspace"
                    size={26}
                    color={Colors.blackColor}
                    onPress={() => { navigation.canGoBack() ? navigation.goBack() : router.replace('/(tabs)/home/homeScreen') }}
                />
                <TouchableOpacity onPress={() => router.replace('/(tabs)/home/homeScreen')} activeOpacity={0.7} style={{ flex: 1, alignItems: 'center' }}>
                    <Image source={require('../../assets/images/dp-logo-02.png')} style={styles.headerLogo} />
                </TouchableOpacity>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                        navigation.push('filter/filterScreen', {
                            category: categoryName,
                            material: filters.material || '',
                            purity: filters.purity || '',
                            goldColor: filters.goldColor || '',
                            diamond: filters.diamond || '',
                            minPrice: filters.minPrice || '',
                            maxPrice: filters.maxPrice || '',
                        })
                    }}
                >
                    <Feather name="sliders" size={20} color={Colors.blackColor} />
                </TouchableOpacity>
            </View>
        )
    }
}

export default CategoryWiseProductsScreen

const styles = StyleSheet.create({
    headerStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Sizes.fixPadding * 2.0,
        paddingVertical: Sizes.fixPadding,
        borderBottomColor: Colors.offWhiteColor,
        borderBottomWidth: 1.0,
    },
    headerLogo: {
        width: Screen.width / 3,
        height: 55,
        resizeMode: 'contain',
        marginRight: Sizes.fixPadding,
    },
    headerTitle: {
        ...Fonts.blackColor18SemiBold,
        marginLeft: Sizes.fixPadding,
        flex: 1,
    },
    headerIconButton: {
        marginLeft: Sizes.fixPadding + 5,
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
