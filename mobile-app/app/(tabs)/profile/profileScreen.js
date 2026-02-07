import { StyleSheet, Text, View, Image, ScrollView, Modal, TouchableOpacity, ActivityIndicator } from 'react-native'
import React, { useState, useEffect } from 'react'
import { Colors, CommomStyles, Fonts, Screen, Sizes } from '../../../constants/styles'
import { Redirect, useNavigation, useRouter } from 'expo-router'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { auth, functions } from '../../../lib/firebase'
import { Feather } from '@expo/vector-icons'

const ProfileScreen = () => {

    const navigation = useNavigation();
    const router = useRouter();

    const [showLogoutDialog, setshowLogoutDialog] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setIsAuthenticated(true);
                // Fetch user profile
                try {
                    const getUserProfile = httpsCallable(functions, 'getUserProfile');
                    const result = await getUserProfile();
                    setUserProfile(result.data);
                } catch (err) {
                    console.log('Error fetching profile:', err);
                }
            } else {
                setIsAuthenticated(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: Colors.whiteColor, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={Colors.primaryColor} />
            </View>
        );
    }

    if (!isAuthenticated) {
        return <Redirect href="/auth/loginScreen" />;
    }

    const userName = userProfile?.name || auth?.currentUser?.displayName || 'User';
    const userPhone = userProfile?.phone || auth?.currentUser?.phoneNumber || '';

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <View style={{ flex: 1 }}>
                {header()}
                <ScrollView showsVerticalScrollIndicator={false}>
                    {profileInfo()}
                    {profileOptions()}
                </ScrollView>
            </View>
            {logoutDialog()}
        </View>
    )

    function logoutDialog() {
        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={showLogoutDialog}
                onRequestClose={() => { setshowLogoutDialog(false) }}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
                    onPress={() => { setshowLogoutDialog(false) }}
                >
                    <View style={{ justifyContent: "center", flex: 1 }}>
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={() => { }}
                            style={styles.dialogStyle}
                        >
                            <View>
                                <Text style={{ textAlign: 'center', ...Fonts.blackColor18SemiBold, marginHorizontal: Sizes.fixPadding }}>
                                    Confirm
                                </Text>
                                <Text style={{ textAlign: 'center', ...Fonts.blackColor16Regular, marginHorizontal: Sizes.fixPadding }}>
                                    Are you sure you want to logout?
                                </Text>
                                <View style={{ flexDirection: 'row', marginTop: Sizes.fixPadding * 2.0 }}>
                                    <TouchableOpacity
                                        activeOpacity={0.5}
                                        onPress={() => { setshowLogoutDialog(false) }}
                                        style={{ ...styles.cancelAndYesButtonStyle, borderTopLeftRadius: Sizes.fixPadding, borderRightWidth: 0.0, }}
                                    >
                                        <Text style={{ ...Fonts.primaryColor19Medium }}>
                                            Cancel
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        activeOpacity={0.5}
                                        onPress={async () => {
                                            setshowLogoutDialog(false);
                                            try {
                                                await signOut(auth);
                                            } finally {
                                                router.replace('/(tabs)/home/homeScreen');
                                            }
                                        }}
                                        style={{ ...styles.cancelAndYesButtonStyle, borderTopRightRadius: Sizes.fixPadding, }}
                                    >
                                        <Text style={{ ...Fonts.primaryColor19Medium }}>
                                            Yes
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        )
    }

    function profileOptions() {
        return (
            <View>
                {profileOptionSort({ icon: require('../../../assets/images/icons/user.png'), option: 'My Account', onPress: () => { navigation.push('editProfile/editProfileScreen') } })}
                {profileOptionSort({ icon: require('../../../assets/images/icons/order.png'), option: 'Orders', onPress: () => { navigation.push('orders/ordersScreen') } })}
                {profileOptionSort({ icon: require('../../../assets/images/icons/map.png'), option: 'Shipping Address', onPress: () => { navigation.push('shippingAddresses/shippingAddressesScreen') } })}
                {/* {profileOptionSort({ icon: require('../../../assets/images/icons/notification.png'), option: 'Notifications', onPress: () => { navigation.push('notifications/notificationsScreen') } })} */}
                {profileOptionSort({ icon: require('../../../assets/images/icons/headset.png'), option: 'Contact us', onPress: () => { navigation.push('contactUs/contactUsScreen') } })}
                {profileOptionSort({ icon: require('../../../assets/images/icons/assignment.png'), option: 'Terms & Conditions', onPress: () => { navigation.push('termsAndCondition/termsAndConditionScreen') } })}
                {profileOptionSort({ icon: require('../../../assets/images/icons/logout.png'), option: 'Logout', onPress: () => { setshowLogoutDialog(true) } })}
            </View>
        )
    }

    function profileOptionSort({ icon, option, onPress }) {
        return (
            <TouchableOpacity
                activeOpacity={0.5}
                onPress={onPress}
                style={styles.profileOptionWrapStyle}
            >
                <Image
                    source={icon}
                    style={{ width: 24.0, height: 24.0, resizeMode: "contain" }}
                />
                <Text style={{ ...Fonts.blackColor16Regular, marginLeft: Sizes.fixPadding + 5.0, flex: 1 }}>
                    {option}
                </Text>
                <Feather name="chevron-right" size={20} color={Colors.grayColor} />
            </TouchableOpacity>
        )
    }

    function profileInfo() {
        return (
            <View style={styles.profileInfoWrapStyle}>
                <View style={styles.profileImageWrapStyle}>
                    {userProfile?.profilePicture ? (
                        <Image
                            source={{ uri: userProfile.profilePicture }}
                            style={styles.profileImage}
                        />
                    ) : (
                        <View style={styles.profileImagePlaceholder}>
                            <Feather name="user" size={40} color={Colors.lightGrayColor} />
                        </View>
                    )}
                </View>
                <Text style={{ ...Fonts.blackColor18SemiBold, marginTop: Sizes.fixPadding }}>
                    {userName}
                </Text>
                {userPhone && (
                    <Text style={{ ...Fonts.grayColor14Regular, marginTop: 2 }}>
                        {userPhone}
                    </Text>
                )}
            </View>
        )
    }

    function header() {
        return (
            <View style={styles.headerStyle}>
                <View style={{ width: 26 }} />
                <TouchableOpacity onPress={() => router.replace('/(tabs)/home/homeScreen')} activeOpacity={0.7} style={{ flex: 1, alignItems: 'center' }}>
                    <Image source={require('../../../assets/images/dp-logo-02.png')} style={styles.headerLogo} />
                </TouchableOpacity>
                <View style={{ width: 26 }} />
            </View>
        )
    }
}

export default ProfileScreen

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
    profileInfoWrapStyle: {
        alignItems: 'center',
        paddingVertical: Sizes.fixPadding * 2.0,
        borderBottomColor: Colors.offWhiteColor,
        borderBottomWidth: 1.0,
        marginBottom: Sizes.fixPadding,
    },
    profileImageWrapStyle: {
        width: Screen.width / 4.5,
        height: Screen.width / 4.5,
        borderRadius: (Screen.width / 4.5) / 2.0,
        borderColor: Colors.offWhiteColor,
        borderWidth: 2.0,
        overflow: 'hidden',
    },
    profileImage: {
        width: '100%',
        height: '100%',
    },
    profileImagePlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: Colors.offWhiteColor,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileOptionWrapStyle: {
        borderColor: Colors.offWhiteColor,
        borderWidth: 1.0,
        borderRadius: Sizes.fixPadding,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginBottom: Sizes.fixPadding + 6.0,
        padding: Sizes.fixPadding + 5.0
    },
    cancelAndYesButtonStyle: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Sizes.fixPadding + 4.0,
        paddingVertical: Sizes.fixPadding + 2.0,
        borderColor: Colors.offWhiteColor,
        borderWidth: 1.0,
    },
    dialogStyle: {
        overflow: 'hidden',
        width: '85%',
        borderRadius: Sizes.fixPadding,
        backgroundColor: Colors.whiteColor,
        alignSelf: 'center',
        paddingTop: Sizes.fixPadding * 2.0
    }
})
