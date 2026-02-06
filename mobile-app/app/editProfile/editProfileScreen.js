import { StyleSheet, Text, View, Modal, TextInput, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import React, { useState, useEffect } from 'react'
import { Colors, Fonts, Sizes, CommomStyles, Screen } from '../../constants/styles'
import { MaterialIcons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation, useRouter } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../../lib/firebase';

const EditProfileScreen = () => {

    const navigation = useNavigation();
    const router = useRouter();

    const [fullName, setfullName] = useState('');
    const [email, setemail] = useState('');
    const [mobileNumber, setmobileNumber] = useState('');
    const [profilePicture, setProfilePicture] = useState('');
    const [showBottomSheet, setShowBottomSheet] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const getUserProfile = httpsCallable(functions, 'getUserProfile');
            const result = await getUserProfile();
            const data = result.data;
            setfullName(data?.name || '');
            setemail(data?.email || '');
            setmobileNumber(data?.phone || auth?.currentUser?.phoneNumber || '');
            setProfilePicture(data?.profilePicture || '');
        } catch (err) {
            console.log('Error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!fullName.trim()) {
            Alert.alert('Error', 'Please enter your name');
            return;
        }

        setSaving(true);
        try {
            const updateUserProfile = httpsCallable(functions, 'updateUserProfile');
            await updateUserProfile({
                name: fullName.trim(),
                phone: mobileNumber.trim(),
            });
            Alert.alert('Success', 'Profile updated successfully', [
                { text: 'OK', onPress: () => navigation.pop() }
            ]);
        } catch (err) {
            console.log('Error updating profile:', err);
            Alert.alert('Error', 'Failed to update profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: Colors.whiteColor, alignItems: 'center', justifyContent: 'center' }}>
                <MyStatusBar />
                <ActivityIndicator color={Colors.primaryColor} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {header()}
                <ScrollView automaticallyAdjustKeyboardInsets={true} showsVerticalScrollIndicator={false}>
                    {profilePic()}
                    {fullNameInfo()}
                    {emailAddressInfo()}
                    {mobileNumberInfo()}
                </ScrollView>
            </View>
            {changeProfilePicOptionsSheet()}
            {updateButton()}
        </View>
    )

    function updateButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleUpdate}
                disabled={saving}
                style={[CommomStyles.buttonStyle, saving && { backgroundColor: Colors.lightGrayColor }]}
            >
                {saving ? (
                    <ActivityIndicator color={Colors.whiteColor} />
                ) : (
                    <Text style={{ ...Fonts.whiteColor19Medium }}>
                        Update
                    </Text>
                )}
            </TouchableOpacity>
        )
    }

    function mobileNumberInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginTop: Sizes.fixPadding * 2.8 }}>
                <Text style={{ ...Fonts.grayColor15Regular }}>
                    Mobile Number
                </Text>
                <TextInput
                    placeholder='Enter Mobile Number'
                    placeholderTextColor={Colors.grayColor}
                    value={mobileNumber}
                    onChangeText={(newVal) => setmobileNumber(newVal)}
                    cursorColor={Colors.primaryColor}
                    selectionColor={Colors.primaryColor}
                    style={[styles.textFieldStyle, { color: Colors.grayColor }]}
                    keyboardType="phone-pad"
                    numberOfLines={1}
                    editable={false}
                />
                <Text style={{ ...Fonts.grayColor14Regular, marginTop: 4, fontSize: 12 }}>
                    Phone number cannot be changed
                </Text>
            </View>
        )
    }

    function emailAddressInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginTop: Sizes.fixPadding * 2.8 }}>
                <Text style={{ ...Fonts.grayColor15Regular }}>
                    Email Address (Optional)
                </Text>
                <TextInput
                    placeholder='Enter Email Address'
                    placeholderTextColor={Colors.grayColor}
                    value={email}
                    onChangeText={(newVal) => setemail(newVal)}
                    cursorColor={Colors.primaryColor}
                    selectionColor={Colors.primaryColor}
                    style={styles.textFieldStyle}
                    keyboardType="email-address"
                    numberOfLines={1}
                />
            </View>
        )
    }

    function fullNameInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginTop: Sizes.fixPadding }}>
                <Text style={{ ...Fonts.grayColor15Regular }}>
                    Full Name *
                </Text>
                <TextInput
                    placeholder='Enter Full Name'
                    placeholderTextColor={Colors.grayColor}
                    value={fullName}
                    onChangeText={(newVal) => setfullName(newVal)}
                    cursorColor={Colors.primaryColor}
                    selectionColor={Colors.primaryColor}
                    style={styles.textFieldStyle}
                    numberOfLines={1}
                />
            </View>
        )
    }

    function changeProfilePicOptionsSheet() {
        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={showBottomSheet}
                onRequestClose={() => { setShowBottomSheet(false) }}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => { setShowBottomSheet(false) }}
                    style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
                >
                    <View style={{ justifyContent: "flex-end", flex: 1 }}>
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={() => { }}
                            style={styles.dialogStyle}
                        >
                            <View style={styles.bottomSheetStyle}>
                                <Text style={{ ...Fonts.blackColor18SemiBold }}>
                                    Choose Option
                                </Text>
                                <View style={{ marginTop: Sizes.fixPadding * 2.5, flexDirection: 'row', }}>
                                    {changeProfilePicOptionsSort({ bgColor: Colors.greenColor, icon: 'camera', option: 'Camera' })}
                                    <View style={{ marginHorizontal: Sizes.fixPadding * 3.0, }}>
                                        {changeProfilePicOptionsSort({ bgColor: Colors.blueColor, icon: 'image', option: 'Gallery' })}
                                    </View>
                                    {changeProfilePicOptionsSort({ bgColor: Colors.redColor, icon: 'delete', option: 'Remove photo' })}
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        )
    }

    function changeProfilePicOptionsSort({ bgColor, icon, option }) {
        return (
            <TouchableOpacity activeOpacity={0.8} onPress={() => { setShowBottomSheet(false) }}>
                <View style={{ ...styles.changeProfilePicOptionsIconWrapStyle, backgroundColor: bgColor, }}>
                    <MaterialCommunityIcons name={icon} size={24} color={Colors.whiteColor} />
                </View>
                <Text style={styles.profileOptionTextStyle}>
                    {option}
                </Text>
            </TouchableOpacity>
        )
    }

    function profilePic() {
        return (
            <View style={{ alignSelf: 'center', margin: Sizes.fixPadding * 2.0 }}>
                {profilePicture ? (
                    <Image
                        source={{ uri: profilePicture }}
                        style={{ width: Screen.width / 4.0, height: Screen.width / 4.0, borderRadius: (Screen.width / 4.0) / 2.0, }}
                    />
                ) : (
                    <View style={styles.profilePlaceholder}>
                        <Feather name="user" size={50} color={Colors.lightGrayColor} />
                    </View>
                )}
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { setShowBottomSheet(true) }}
                    style={styles.changeProfilePicIconWrapStyle}
                >
                    <MaterialIcons name="camera-alt" size={Screen.width / 20.0} color={Colors.whiteColor} />
                </TouchableOpacity>
            </View>
        )
    }

    function header() {
        return (
            <View style={styles.headerStyle}>
                <MaterialIcons name="keyboard-backspace" size={26} color={Colors.blackColor} onPress={() => { navigation.pop() }} />
                <TouchableOpacity onPress={() => router.replace('/(tabs)/home/homeScreen')} activeOpacity={0.7} style={{ flex: 1, alignItems: 'center' }}>
                    <Image source={require('../../assets/images/dp-logo-02.png')} style={CommomStyles.headerLogo} />
                </TouchableOpacity>
                <View style={{ width: 26 }} />
            </View>
        )
    }
}

export default EditProfileScreen

const styles = StyleSheet.create({
    headerStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Sizes.fixPadding * 2.0,
        borderBottomColor: Colors.offWhiteColor,
        borderBottomWidth: 1.0,
    },
    changeProfilePicIconWrapStyle: {
        width: Screen.width / 11.0,
        height: Screen.width / 11.0,
        borderRadius: (Screen.width / 11.0) / 2.0,
        backgroundColor: Colors.blackColor,
        position: 'absolute', right: 0.0,
        bottom: 0.0,
        elevation: 3.0,
        alignItems: 'center',
        justifyContent: 'center'
    },
    changeProfilePicOptionsIconWrapStyle: {
        width: 50.0,
        height: 50.0,
        borderRadius: 25.0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomSheetStyle: {
        backgroundColor: Colors.whiteColor,
        borderTopLeftRadius: Sizes.fixPadding + 5.0,
        borderTopRightRadius: Sizes.fixPadding + 5.0,
        paddingHorizontal: Sizes.fixPadding * 2.0,
        paddingVertical: Sizes.fixPadding * 2.5,
    },
    profileOptionTextStyle: {
        textAlign: 'center',
        maxWidth: Screen.width / 4.5,
        marginTop: Sizes.fixPadding - 5.0,
        ...Fonts.grayColor15Regular,
    },
    textFieldStyle: {
        ...Fonts.blackColor17Regular,
        borderBottomColor: Colors.blackColor,
        borderBottomWidth: 1.0,
        padding: 0,
        paddingBottom: Sizes.fixPadding,
    },
    profilePlaceholder: {
        width: Screen.width / 4.0,
        height: Screen.width / 4.0,
        borderRadius: (Screen.width / 4.0) / 2.0,
        backgroundColor: Colors.offWhiteColor,
        alignItems: 'center',
        justifyContent: 'center',
    },
})
