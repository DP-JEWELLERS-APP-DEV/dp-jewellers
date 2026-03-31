import { StyleSheet, Text, View, Image, TouchableOpacity, DeviceEventEmitter } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Colors, Fonts, Sizes, Screen } from '../constants/styles'
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../lib/firebase';

const placeholderImage = require('../assets/images/jewellery/jewellary1.png');

const ProductCard = ({
    item,
    style,
    horizontal = false,
    onFavoriteChange,
    showSnackBar,
}) => {
    const navigation = useNavigation();
    const [isFavorite, setIsFavorite] = useState(item?.isFavorite || false);
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

    useEffect(() => {
        setIsFavorite(Boolean(item?.isFavorite));
    }, [item?.isFavorite, item?.productId]);

    const handlePress = () => {
        navigation.push('productDetail/productDetailScreen', { productId: item.productId });
    };

    const handleAddToCart = async (e) => {
        e.stopPropagation();
        if (!auth?.currentUser) {
            navigation.push('auth/loginScreen');
            return;
        }
        if (isAddingToCart) return;

        setIsAddingToCart(true);
        try {
            const updateCart = httpsCallable(functions, 'updateCart');
            await updateCart({
                action: 'add',
                productId: item.productId,
                quantity: 1,
            });
            DeviceEventEmitter.emit('cartUpdated');
            showSnackBar?.('Added to cart');
        } catch (err) {
            showSnackBar?.('Failed to add to cart');
        } finally {
            setIsAddingToCart(false);
        }
    };

    const handleToggleFavorite = async (e) => {
        e.stopPropagation();
        if (!auth?.currentUser) {
            navigation.push('auth/loginScreen');
            return;
        }
        if (isTogglingFavorite) return;

        setIsTogglingFavorite(true);
        try {
            const updateFavorites = httpsCallable(functions, 'updateFavorites');
            const action = isFavorite ? 'remove' : 'add';
            await updateFavorites({ action, productId: item.productId });
            setIsFavorite(!isFavorite);
            onFavoriteChange?.(!isFavorite, item.productId);
            DeviceEventEmitter.emit('favoritesUpdated');
            showSnackBar?.(isFavorite ? 'Removed from wishlist' : 'Added to wishlist');
        } catch (err) {
            showSnackBar?.('Failed to update wishlist');
        } finally {
            setIsTogglingFavorite(false);
        }
    };

    const cardStyle = horizontal ? styles.horizontalCard : styles.verticalCard;
    const imageContainerStyle = horizontal ? styles.horizontalImageContainer : styles.verticalImageContainer;

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePress}
            style={[cardStyle, style]}
        >
            {/* Product Image */}
            <View style={imageContainerStyle}>
                <Image
                    source={item.image ? { uri: item.image } : placeholderImage}
                    style={horizontal ? styles.horizontalImage : styles.verticalImage}
                />
                {/* Favorite Button */}
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleToggleFavorite}
                    style={styles.favoriteButton}
                    disabled={isTogglingFavorite}
                >
                    <MaterialIcons
                        name={isFavorite ? "favorite" : "favorite-border"}
                        size={18}
                        color={isFavorite ? Colors.redColor : Colors.grayColor}
                    />
                </TouchableOpacity>
                {item.newArrival && (
                    <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                )}
            </View >

            {/* Divider */}
            < View style={styles.divider} />

            {/* Product Info */}
            < View style={styles.infoContainer} >
                <Text numberOfLines={2} style={styles.productName}>
                    {item.name}
                </Text>
                <View style={styles.priceRow}>
                    <Text numberOfLines={1} style={styles.productPrice}>
                        {`₹ ${Number(item.finalPrice || 0).toLocaleString('en-IN')}`}
                    </Text>
                    {/* Add to Cart Button */}
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={handleAddToCart}
                        style={styles.addToCartButton}
                        disabled={isAddingToCart}
                    >
                        <Feather
                            name="shopping-bag"
                            size={14}
                            color={Colors.whiteColor}
                        />
                    </TouchableOpacity>
                </View>
                {
                    item.category && (
                        <Text numberOfLines={1} style={styles.categoryText}>
                            {item.category}
                        </Text>
                    )
                }
            </View >
        </TouchableOpacity >
    );
};

export default ProductCard;

const styles = StyleSheet.create({
    verticalCard: {
        borderColor: '#EEE2CC',
        borderWidth: 1.0,
        borderRadius: Sizes.fixPadding + 2.0,
        marginHorizontal: Sizes.fixPadding - 2.0,
        maxWidth: (Screen.width / 2.0) - 24,
        flex: 1,
        marginBottom: Sizes.fixPadding + 8.0,
        backgroundColor: Colors.whiteColor,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    horizontalCard: {
        borderColor: '#EEE2CC',
        borderWidth: 1.0,
        borderRadius: Sizes.fixPadding + 2.0,
        marginHorizontal: Sizes.fixPadding - 3.0,
        width: Screen.width * 0.43,
        backgroundColor: Colors.whiteColor,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        minHeight: 262,
    },
    verticalImageContainer: {
        position: 'relative',
        width: '100%',
        aspectRatio: 1,
        overflow: 'hidden',
        borderTopLeftRadius: Sizes.fixPadding + 2.0,
        borderTopRightRadius: Sizes.fixPadding + 2.0,
    },
    horizontalImageContainer: {
        position: 'relative',
        width: '100%',
        aspectRatio: 1,
        overflow: 'hidden',
        borderTopLeftRadius: Sizes.fixPadding + 2.0,
        borderTopRightRadius: Sizes.fixPadding + 2.0,
    },
    verticalImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    horizontalImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    favoriteButton: {
        position: 'absolute',
        top: Sizes.fixPadding - 2,
        right: Sizes.fixPadding - 2,
        backgroundColor: 'rgba(255,253,244,0.95)',
        borderRadius: 16,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
    },
    divider: {
        backgroundColor: '#F1E8D8',
        height: 1.0,
    },
    infoContainer: {
        paddingHorizontal: Sizes.fixPadding,
        paddingVertical: Sizes.fixPadding - 1,
        minHeight: 100,
    },
    productName: {
        ...Fonts.blackColor15Medium,
        lineHeight: 18.0,
        minHeight: 40,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    productPrice: {
        ...Fonts.blackColor16SemiBold,
        flex: 1,
        color: '#111111',
    },
    addToCartButton: {
        backgroundColor: Colors.primaryColor,
        borderRadius: 10,
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryText: {
        ...Fonts.grayColor13Medium,
        marginTop: 3,
        minHeight: 20,
    },
    newBadge: {
        position: 'absolute',
        top: 0,
        left: 0,
        backgroundColor: Colors.primaryColor,
        borderBottomRightRadius: Sizes.fixPadding,
        paddingHorizontal: 8,
        paddingVertical: 4,
        zIndex: 10,
    },
    newBadgeText: {
        ...Fonts.whiteColor12Medium,
        fontSize: 10,
        letterSpacing: 0.5,
    },
});
