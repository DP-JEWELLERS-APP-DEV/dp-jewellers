import { StyleSheet, Text, View, Image, FlatList, TouchableOpacity, Platform, ActivityIndicator } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { Colors, Fonts, Sizes, Screen, CommomStyles } from '../../constants/styles'
import CollapsibleToolbar from 'react-native-collapsible-toolbar';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { Snackbar } from 'react-native-paper';
import MyStatusBar from '../../components/myStatusBar';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../../lib/firebase';

const fallbackImage = require('../../assets/images/jewellery/jewellary15.png');

const ProductDetailScreen = () => {

    const navigation = useNavigation();
    const { productId } = useLocalSearchParams();

    const [selectedSize, setselectedSize] = useState('');
    const [isFavorite, setisFavorite] = useState(false);
    const [showSnackBar, setshowSnackBar] = useState(false);
    const [snackText, setsnackText] = useState('');
    const [product, setproduct] = useState(null);
    const [loading, setloading] = useState(true);
    const [errorText, seterrorText] = useState('');
    const [activeIndex, setactiveIndex] = useState(0);
    const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 60 });
    const onViewRef = useRef(({ viewableItems }) => {
        if (viewableItems && viewableItems.length > 0) {
            setactiveIndex(viewableItems[0].index || 0);
        }
    });

    useEffect(() => {
        let active = true;
        const fetchProduct = async () => {
            if (!productId) {
                seterrorText('Product not found.');
                setloading(false);
                return;
            }
            setloading(true);
            seterrorText('');
            try {
                const getProduct = httpsCallable(functions, 'getProduct');
                const res = await getProduct({ productId });
                if (active) {
                    setproduct(res.data);
                    if (res.data?.sizes?.length) {
                        setselectedSize(res.data.sizes[0]);
                    }
                }
            } catch (err) {
                if (active) {
                    seterrorText('Failed to load product.');
                }
            } finally {
                if (active) setloading(false);
            }
        };
        fetchProduct();
        return () => { active = false; };
    }, [productId]);

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {loading ? (
                    <View style={styles.centerWrap}>
                        <ActivityIndicator color={Colors.primaryColor} />
                    </View>
                ) : errorText ? (
                    <View style={styles.centerWrap}>
                        <Text style={styles.errorText}>{errorText}</Text>
                    </View>
                ) : (
                    <>
                        <CollapsibleToolbar
                            renderContent={pageContent}
                            renderNavBar={header}
                            renderToolBar={productImage}
                            collapsedNavBarBackgroundColor={Colors.whiteColor}
                            translucentStatusBar={false}
                            toolBarHeight={Screen.height / 2.8}
                            showsVerticalScrollIndicator={false}
                        />
                        {addToCartButton()}
                        {snackBar()}
                    </>
                )}
            </View>
        </View>
    )

    function snackBar() {
        return (
            <Snackbar
                visible={showSnackBar}
                onDismiss={() => { setshowSnackBar(false) }}
                elevation={0.0}
                style={CommomStyles.snackBarStyle}
            >
                <Text style={{ ...Fonts.whiteColor16Medium }}>
                    {snackText}
                </Text>
            </Snackbar>
        )
    }

    function addToCartButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.5}
                onPress={handleAddToCart}
                style={CommomStyles.buttonStyle}
            >
                <Text style={{ ...Fonts.whiteColor19Medium }}>
                    Add to Cart
                </Text>
            </TouchableOpacity>
        )
    }

    function productImage() {
        const imageList = (product?.images || []).map((img) => ({
            image: img?.url || img,
        }));
        const finalImages = imageList.length ? imageList : [{ image: fallbackImage }];
        const isRemote = imageList.length > 0;
        return (
            <View style={{ height: Screen.height / 2.8 }}>
                <FlatList
                    data={finalImages}
                    keyExtractor={(_, index) => `${index}`}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onViewableItemsChanged={onViewRef.current}
                    viewabilityConfig={viewConfigRef.current}
                    renderItem={({ item }) => (
                        <View style={{ width: Screen.width }}>
                            <Image
                                source={isRemote ? { uri: item.image } : item.image}
                                style={styles.productImageStyle}
                            />
                        </View>
                    )}
                />
                <View style={styles.dotsWrap}>
                    {finalImages.map((_, idx) => (
                        <View
                            key={`${idx}`}
                            style={[
                                styles.dotStyle,
                                idx === activeIndex ? styles.dotActive : styles.dotInactive,
                            ]}
                        />
                    ))}
                </View>
            </View>
        )
    }

    function pageContent() {
        return (
            <View style={{ flex: 1, }}>
                {divider()}
                {productNameAndPriceInfo()}
                {productSizeInfo()}
                {productDescriptionInfo()}
            </View>
        )
    }

    function productDescriptionInfo() {
        const description = product?.description || '';
        return (
            <View style={{ margin: Sizes.fixPadding * 2.0 }}>
                <Text style={{ ...Fonts.blackColor16Medium, marginBottom: Sizes.fixPadding }}>
                    Description
                </Text>
                <Text style={{ ...Fonts.grayColor15Regular, lineHeight: 23.0 }}>
                    {description || 'No description available.'}
                </Text>
            </View>
        )
    }

    function productSizeInfo() {
        const sizes = product?.sizes || [];
        if (!sizes.length) return null;
        const renderItem = ({ item }) => (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { setselectedSize(item) }}
                style={{
                    ...styles.productSizeBoxStyle,
                    backgroundColor: selectedSize == item ? Colors.primaryColor : 'transparent'
                }}>
                <Text style={selectedSize == item ? { ...Fonts.whiteColor15Regular } : { ...Fonts.grayColor15Regular, }}>
                    {item}
                </Text>
            </TouchableOpacity >
        )
        return (
            <View>
                <Text style={{ marginHorizontal: Sizes.fixPadding * 2.0, ...Fonts.blackColor16Medium, marginBottom: Sizes.fixPadding, }}>
                    Size
                </Text>
                <FlatList
                    data={sizes}
                    keyExtrator={(item, index) => { `${item}${index}` }}
                    renderItem={renderItem}
                    horizontal
                    contentContainerStyle={{ paddingHorizontal: Sizes.fixPadding + 3.0 }}
                    showsHorizontalScrollIndicator={false}
                />
            </View>
        )
    }

    function productNameAndPriceInfo() {
        return (
            <View style={{ flexDirection: 'row', margin: Sizes.fixPadding * 2.0, }}>
                <View style={{ flex: 1, marginRight: Sizes.fixPadding }}>
                    <Text numberOfLines={1} style={{ ...Fonts.blackColor18Medium }}>
                        {product?.name || 'Product'}
                    </Text>
                    <Text style={{ ...Fonts.grayColor13Medium }}>
                        {product?.category || ''}
                    </Text>
                </View>
                <Text style={{ ...Fonts.primaryColor18Bold }}>
                    {`₹`}{Number(product?.pricing?.finalPrice || 0).toFixed(2)}
                </Text>
            </View>
        )
    }

    function divider() {
        return (
            <View style={{ backgroundColor: Colors.offWhiteColor, height: 1.0, }} />
        )
    }

    function header() {
        return (
            <View style={styles.headerWrapStyle}>
                <Image source={require('../../assets/images/dp-logo-01.png')} style={CommomStyles.headerLogo} />
                <MaterialIcons
                    name="keyboard-backspace"
                    size={26}
                    color={Colors.blackColor}
                    onPress={() => { navigation.pop() }}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons
                        name={isFavorite ? "favorite" : "favorite-border"}
                        size={23}
                        color={Colors.blackColor}
                        style={{ marginRight: Sizes.fixPadding * 2.0 }}
                        onPress={toggleFavorite}
                    />
                    <Feather name="share-2" size={20} color={Colors.blackColor} />
                </View>
            </View>
        )
    }

    async function handleAddToCart() {
        if (!auth?.currentUser) {
            navigation.push('auth/loginScreen');
            return;
        }
        try {
            const updateCart = httpsCallable(functions, 'updateCart');
            await updateCart({
                action: 'add',
                productId,
                size: selectedSize || null,
                quantity: 1,
            });
            setsnackText('Added to cart');
            setshowSnackBar(true);
        } catch (err) {
            setsnackText('Failed to add to cart');
            setshowSnackBar(true);
        }
    }

    async function toggleFavorite() {
        if (!auth?.currentUser) {
            navigation.push('auth/loginScreen');
            return;
        }
        try {
            const updateFavorites = httpsCallable(functions, 'updateFavorites');
            const action = isFavorite ? 'remove' : 'add';
            await updateFavorites({ action, productId });
            setisFavorite(!isFavorite);
            setsnackText(isFavorite ? 'Removed from favorite' : 'Added to favorite');
            setshowSnackBar(true);
        } catch (err) {
            setsnackText('Failed to update favorite');
            setshowSnackBar(true);
        }
    }
}

export default ProductDetailScreen

const styles = StyleSheet.create({
    headerWrapStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginTop: Platform.OS == 'ios' ? 0 : Sizes.fixPadding + 10.0
    },
    dotsWrap: {
        position: 'absolute',
        bottom: Sizes.fixPadding,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    dotStyle: {
        marginHorizontal: 4,
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dotActive: {
        backgroundColor: Colors.lightGrayColor,
    },
    dotInactive: {
        backgroundColor: '#F0F0F0',
    },
    productImageStyle: {
        width: Screen.width / 1.8,
        height: Screen.height / 3.8,
        resizeMode: 'contain',
        alignSelf: 'center',
    },
    productSizeBoxStyle: {
        borderColor: Colors.offWhiteColor,
        borderWidth: 1.0,
        paddingHorizontal: Sizes.fixPadding - 2.0,
        paddingVertical: Sizes.fixPadding - 7.0,
        marginHorizontal: Sizes.fixPadding - 3.0,
        borderRadius: Sizes.fixPadding - 5.0,
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
