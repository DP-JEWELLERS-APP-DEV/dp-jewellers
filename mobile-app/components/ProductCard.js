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

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePress}
            style={[cardStyle, style]}
        >
            {/* Product Image */}
            <View style={styles.imageContainer}>
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
                <Text numberOfLines={1} style={styles.productName}>
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
        borderColor: Colors.offWhiteColor,
        borderWidth: 1.0,
        borderRadius: Sizes.fixPadding,
        marginHorizontal: Sizes.fixPadding,
        maxWidth: (Screen.width / 2.0) - 30,
        flex: 1,
        marginBottom: Sizes.fixPadding * 2.0,
        backgroundColor: Colors.whiteColor,
    },
    horizontalCard: {
        borderColor: Colors.offWhiteColor,
        borderWidth: 1.0,
        borderRadius: Sizes.fixPadding,
        marginHorizontal: Sizes.fixPadding,
        width: Screen.width / 2.4,
        backgroundColor: Colors.whiteColor,
    },
    imageContainer: {
        position: 'relative',
        width: '100%',
        height: (Screen.width / 3.5) + (Sizes.fixPadding + 5.0) * 2,
        overflow: 'hidden',
        borderTopLeftRadius: Sizes.fixPadding,
        borderTopRightRadius: Sizes.fixPadding,
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
        backgroundColor: Colors.whiteColor,
        borderRadius: 15,
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
    },
    divider: {
        backgroundColor: Colors.offWhiteColor,
        height: 1.0,
    },
    infoContainer: {
        padding: Sizes.fixPadding,
    },
    productName: {
        ...Fonts.blackColor16Regular,
        lineHeight: 20.0,
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
    },
    addToCartButton: {
        backgroundColor: Colors.primaryColor,
        borderRadius: Sizes.fixPadding - 5,
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryText: {
        ...Fonts.grayColor14Regular,
        marginTop: 2,
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
