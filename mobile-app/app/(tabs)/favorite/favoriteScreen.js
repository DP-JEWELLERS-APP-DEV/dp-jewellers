import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Colors, CommomStyles, Fonts, Screen, Sizes } from '../../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons';
import { Snackbar } from 'react-native-paper';
import { useNavigation } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../../../lib/firebase';

const placeholderImage = require('../../../assets/images/jewellery/jewellary1.png');

const FavoriteScreen = () => {

    const navigation = useNavigation();

    const [favorites, setfavorites] = useState([]);
    const [showSnackBar, setShowSnackBar] = useState(false);
    const [loading, setloading] = useState(true);
    const [errorText, seterrorText] = useState('');

    const requireAuth = () => {
        if (!auth?.currentUser) {
            navigation.push('auth/loginScreen');
            return false;
        }
        return true;
    };

    useEffect(() => {
        if (!requireAuth()) return;
        fetchFavorites();
    }, []);

    const fetchFavorites = async () => {
        if (!requireAuth()) return;
        setloading(true);
        seterrorText('');
        try {
            const getFavorites = httpsCallable(functions, 'getFavorites');
            const res = await getFavorites();
            setfavorites(res?.data?.favorites || []);
        } catch (err) {
            seterrorText('Failed to load favorites.');
            setfavorites([]);
        } finally {
            setloading(false);
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
                ) : favorites.length == 0 ? (
                    noFavoriteItemsInfo()
                ) : (
                    favoritesItemsInfo()
                )}
                {snackBar()}
            </View>
        </View>
    )

    function snackBar() {
        return (
            <Snackbar
                visible={showSnackBar}
                onDismiss={() => { setShowSnackBar(false) }}
                elevation={0.0}
                style={CommomStyles.snackBarStyle}
            >
                <Text style={{ ...Fonts.whiteColor16Medium }}>
                    Removed From Favorite
                </Text>
            </Snackbar>
        )
    }

    function noFavoriteItemsInfo() {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="favorite-border" size={26} color={Colors.lightGrayColor} />
                <Text style={{ ...Fonts.lightGrayColor18SemiBold, color: Colors.lightGrayColor, marginTop: Sizes.fixPadding - 5.0 }}>
                    Nothing in Favorite
                </Text>
            </View>
        )
    }

    async function removeFormFavorite({ productId }) {
        if (!requireAuth()) return;
        try {
            const updateFavorites = httpsCallable(functions, 'updateFavorites');
            await updateFavorites({ action: 'remove', productId });
            await fetchFavorites();
            setShowSnackBar(true);
        } catch (err) {
            seterrorText('Failed to remove favorite.');
        }
    }

    function favoritesItemsInfo() {
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
                <MaterialIcons
                    name="favorite"
                    size={18}
                    color={Colors.blackColor}
                    style={{ position: 'absolute', right: 10.0, top: 10.0 }}
                    onPress={() => { removeFormFavorite({ productId: item.productId }) }}
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
                data={favorites}
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
            <View style={{ ...CommomStyles.headerStyle }}>
                <Image source={require('../../../assets/images/dp-logo-01.png')} style={CommomStyles.headerLogo} />
                <Text style={{ ...Fonts.blackColor20SemiBold }}>
                    Favourite
                </Text>
            </View>
        )
    }
}

export default FavoriteScreen

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
