import { StyleSheet, Text, View, Image, ScrollView, Modal, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { Colors, CommomStyles, Fonts, Screen, Sizes } from '../../../constants/styles'
import { Redirect, useNavigation, useRouter } from 'expo-router'
import { signOut } from 'firebase/auth'
import { auth } from '../../../lib/firebase'

const ProfileScreen = () => {

    const navigation = useNavigation();
    const router = useRouter();

    const [showLogoutDialog, setshowLogoutDialog] = useState(false);
    if (!auth?.currentUser) {
        return <Redirect href="/auth/loginScreen" />;
    }

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <View style={{ flex: 1 }}>
                {header()}
                <ScrollView showsVerticalScrollIndicator={false}>
                    {profileImage()}
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
                                    Are you sure, You want to exit
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
                                            setshowLogoutDialog(false)
                                            try {
                                                await signOut(auth)
                                            } finally {
                                                router.replace('/home/homeScreen')
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
                {profileOptionSort({ icon: require('../../../assets/images/icons/notification.png'), option: 'Notifications', onPress: () => { navigation.push('notifications/notificationsScreen') } })}
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
                <Text style={{ ...Fonts.blackColor16Regular, marginLeft: Sizes.fixPadding + 5.0 }}>
                    {option}
                </Text>
            </TouchableOpacity>
        )
    }

    function profileImage() {
        return (
            <View style={styles.profileImageWrapStyle}>
                <Image
                    source={require('../../../assets/images/user/user1.png')}
                    style={{ width: (Screen.width / 5.6), height: (Screen.width / 5.6), borderRadius: (Screen.width / 5.6) / 2.0 }}
                />
            </View>
        )
    }

    function header() {
        return (
            <View style={{ ...CommomStyles.headerStyle }}>
                <Image source={require('../../../assets/images/dp-logo-01.png')} style={CommomStyles.headerLogo} />
                <Text style={{ ...Fonts.blackColor20SemiBold }}>
                    Profile
                </Text>
            </View>
        )
    }
}

export default ProfileScreen

const styles = StyleSheet.create({
    profileImageWrapStyle: {
        alignSelf: 'center',
        margin: Sizes.fixPadding * 2.0,
        alignItems: 'center',
        justifyContent: 'center',
        width: Screen.width / 4.7,
        height: Screen.width / 4.7,
        borderRadius: (Screen.width / 4.7) / 2.0,
        borderColor: Colors.blackColor,
        borderWidth: 1.0,
    },
    profileOptionWrapStyle: {
        borderColor: Colors.offWhiteColor,
        borderWidth: 1.0,
        borderRadius: Sizes.fixPadding,
        flexDirection: 'row',
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
