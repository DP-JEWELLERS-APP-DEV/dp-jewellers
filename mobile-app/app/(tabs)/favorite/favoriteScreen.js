import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Colors, CommomStyles, Fonts, Screen, Sizes } from '../../../constants/styles'
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { Snackbar } from 'react-native-paper';
import { useNavigation, useRouter } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, functions } from '../../../lib/firebase';
import ProductCard from '../../../components/ProductCard';

const FavoriteScreen = () => {

    const navigation = useNavigation();
    const router = useRouter();

    const [favorites, setfavorites] = useState([]);
    const [showSnackBar, setShowSnackBar] = useState(false);
    const [snackText, setSnackText] = useState('');
    const [loading, setloading] = useState(true);
    const [errorText, seterrorText] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setIsAuthenticated(true);
                fetchFavorites();
            } else {
                setIsAuthenticated(false);
                setloading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const fetchFavorites = async () => {
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

    const handleShowSnackBar = (text) => {
        setSnackText(text);
        setShowSnackBar(true);
    };

    const handleFavoriteChange = (isFavorite, productId) => {
        if (!isFavorite) {
            // Item was removed from favorites, refresh the list
            fetchFavorites();
        }
    };

    // Show login prompt for unauthenticated users
    if (isAuthenticated === false) {
        return (
            <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
                {header()}
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Sizes.fixPadding * 2 }}>
                    <MaterialIcons name="favorite-border" size={60} color={Colors.lightGrayColor} />
                    <Text style={{ ...Fonts.blackColor18SemiBold, marginTop: Sizes.fixPadding * 2.0, textAlign: 'center' }}>
                        Login to view your wishlist
                    </Text>
                    <Text style={{ ...Fonts.grayColor15Regular, marginTop: Sizes.fixPadding - 5, textAlign: 'center' }}>
                        Sign in to save your favorite items
                    </Text>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => navigation.push('auth/loginScreen')}
                        style={styles.loginButton}
                    >
                        <Text style={{ ...Fonts.whiteColor19Medium }}>
                            Login
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

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

    function noFavoriteItemsInfo() {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="favorite-border" size={40} color={Colors.lightGrayColor} />
                <Text style={{ ...Fonts.lightGrayColor18SemiBold, color: Colors.lightGrayColor, marginTop: Sizes.fixPadding - 5.0 }}>
                    Nothing in Wishlist
                </Text>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.replace('/(tabs)/home/homeScreen')}
                    style={[styles.loginButton, { marginTop: Sizes.fixPadding * 2 }]}
                >
                    <Text style={{ ...Fonts.whiteColor19Medium }}>
                        Explore Products
                    </Text>
                </TouchableOpacity>
            </View>
        )
    }

    function favoritesItemsInfo() {
        return (
            <FlatList
                data={favorites.map(f => ({ ...f, isFavorite: true }))}
                keyExtractor={(item) => `${item.productId}`}
                renderItem={({ item }) => (
                    <ProductCard
                        item={item}
                        showSnackBar={handleShowSnackBar}
                        onFavoriteChange={handleFavoriteChange}
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
                <Text style={{ ...Fonts.blackColor18SemiBold, flex: 1 }}>
                    Wishlist
                </Text>
                <TouchableOpacity onPress={() => router.replace('/(tabs)/home/homeScreen')} activeOpacity={0.7}>
                    <Image source={require('../../../assets/images/dp-logo-02.png')} style={styles.headerLogo} />
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
            </View>
        )
    }
}

export default FavoriteScreen

const styles = StyleSheet.create({
    headerStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Sizes.fixPadding * 2.0,
        paddingVertical: Sizes.fixPadding,
        borderBottomColor: Colors.offWhiteColor,
        borderBottomWidth: 1.0,
    },
    headerLogo: {
        width: Screen.width / 3,
        height: 55,
        resizeMode: 'contain',
    },
    loginButton: {
        backgroundColor: Colors.blackColor,
        paddingHorizontal: Sizes.fixPadding * 4,
        paddingVertical: Sizes.fixPadding + 2,
        borderRadius: Sizes.fixPadding,
        marginTop: Sizes.fixPadding * 2.5,
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
