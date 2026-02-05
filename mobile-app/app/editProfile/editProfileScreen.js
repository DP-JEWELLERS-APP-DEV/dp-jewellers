import { StyleSheet, Text, View, Modal, TextInput, Image, ScrollView, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { Colors, Fonts, Sizes, CommomStyles, Screen } from '../../constants/styles'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation } from 'expo-router';

const EditProfileScreen = () => {

    const navigation = useNavigation();

    const [fullName, setfullName] = useState('Samantha Smith');
    const [email, setemail] = useState('samanthasmith@email.com');
    const [mobileNumber, setmobileNumber] = useState('+79 147 852 698');
    const [password, setpassword] = useState('123456789');
    const [showBottomSheet, setShowBottomSheet] = useState(false);

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
                    {passwordInfo()}
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
                onPress={() => { navigation.pop() }}
                style={CommomStyles.buttonStyle}
            >
                <Text style={{ ...Fonts.whiteColor19Medium }}>
                    Update
                </Text>
            </TouchableOpacity>
        )
    }

    function passwordInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginVertical: Sizes.fixPadding * 2.8 }}>
                <Text style={{ ...Fonts.grayColor15Regular }}>
                    Password
                </Text>
                <TextInput
                    placeholder='Enter Password'
                    placeholderTextColor={Colors.grayColor}
                    value={password}
                    onChangeText={(newVal) => setpassword(newVal)}
                    cursorColor={Colors.primaryColor}
                    selectionColor={Colors.primaryColor}
                    style={styles.textFieldStyle}
                    secureTextEntry={true}
                    numberOfLines={1}
                />
            </View>
        )
    }

    function mobileNumberInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, }}>
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
                    style={styles.textFieldStyle}
                    keyboardType="phone-pad"
                    numberOfLines={1}
                />
            </View>
        )
    }

    function emailAddressInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginVertical: Sizes.fixPadding * 2.8 }}>
                <Text style={{ ...Fonts.grayColor15Regular }}>
                    Email Address
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
                    Full Name
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
                <Image
                    source={require('../../assets/images/user/user1.png')}
                    style={{ width: Screen.width / 4.0, height: Screen.width / 4.0, borderRadius: (Screen.width / 4.0) / 2.0, }}
                />
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
            <View style={CommomStyles.headerStyle}>
                <Image source={require('../../assets/images/dp-logo-01.png')} style={CommomStyles.headerLogo} />
                <MaterialIcons name="keyboard-backspace" size={26} color={Colors.blackColor} onPress={() => { navigation.pop() }} />
                <Text numberOfLines={1} style={{ ...Fonts.blackColor20SemiBold, marginLeft: Sizes.fixPadding * 2.0, }}>
                    Edit Profile
                </Text>
            </View>
        )
    }
}

export default EditProfileScreen

const styles = StyleSheet.create({
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
    }
})
