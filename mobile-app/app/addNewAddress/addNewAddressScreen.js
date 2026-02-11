import { StyleSheet, Text, View, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Keyboard, DeviceEventEmitter } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { Colors, Fonts, Sizes, CommomStyles } from '../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons';
import SelectDropdown from 'react-native-select-dropdown'
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation, useRouter, useLocalSearchParams } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';

const addressTypeList = ['Home', 'Office', 'Other'];

const AddNewAddressScreen = () => {

    const navigation = useNavigation();
    const router = useRouter();
    const params = useLocalSearchParams();
    const mode = params.mode;
    const addressIndex = params.addressIndex !== undefined ? Number(params.addressIndex) : null;

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [addressLine1, setAddressLine1] = useState('');
    const [addressLine2, setAddressLine2] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [pincode, setPincode] = useState('');
    const [addressType, setAddressType] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [initialIsDefault, setInitialIsDefault] = useState(false);
    const [saving, setSaving] = useState(false);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        if (mode !== 'edit' || !params.address) return;
        try {
            const parsed = JSON.parse(params.address);
            setName(parsed.name || '');
            setPhone(parsed.phone || parsed.mobileNo || parsed.contactNumber || '');
            setAddressLine1(parsed.addressLine1 || parsed.completeAddress || parsed.address || '');
            setAddressLine2(parsed.addressLine2 || '');
            setCity(parsed.city || '');
            setState(parsed.state || '');
            setPincode(parsed.pincode || '');
            const type = parsed.addressType ? String(parsed.addressType) : '';
            setAddressType(type ? type.charAt(0).toUpperCase() + type.slice(1) : '');
            const def = Boolean(parsed.isDefault);
            setIsDefault(def);
            setInitialIsDefault(def);
        } catch (err) {
            // Ignore parse errors
        }
        return () => {
            isMounted.current = false;
        };
    }, [mode, params.address]);

    const validateForm = ({ silent = false } = {}) => {
        if (!name.trim()) {
            if (!silent) Alert.alert('Error', 'Please enter your name');
            return false;
        }
        if (!phone.trim() || phone.length < 10) {
            if (!silent) Alert.alert('Error', 'Please enter a valid phone number');
            return false;
        }
        if (!addressLine1.trim()) {
            if (!silent) Alert.alert('Error', 'Please enter your address');
            return false;
        }
        if (!city.trim()) {
            if (!silent) Alert.alert('Error', 'Please enter your city');
            return false;
        }
        if (!state.trim()) {
            if (!silent) Alert.alert('Error', 'Please enter your state');
            return false;
        }
        if (!pincode.trim() || pincode.length !== 6) {
            if (!silent) Alert.alert('Error', 'Please enter a valid 6-digit pincode');
            return false;
        }
        if (!addressType) {
            if (!silent) Alert.alert('Error', 'Please select address type');
            return false;
        }
        return true;
    };

    const closeScreen = () => {
        try {
            if (navigation?.canGoBack && navigation.canGoBack()) {
                navigation.goBack();
                return;
            }
        } catch (err) {
            // ignore
        }
        try {
            router.back();
        } catch (err) {
            // ignore
        }
    };

    const handleAddAddress = async ({ closeImmediately = false, silent = false, skipValidation = false } = {}) => {
        Keyboard.dismiss();
        if (!skipValidation && !validateForm({ silent })) return;

        if (isMounted.current) {
            setSaving(true);
        }
        if (closeImmediately) {
            closeScreen();
        }
        try {
            const manageAddress = httpsCallable(functions, 'manageAddress');
            if (mode === 'edit' && addressIndex !== null && !Number.isNaN(addressIndex)) {
                await manageAddress({
                    action: 'update',
                    addressIndex,
                    address: {
                        addressType: addressType.toLowerCase(),
                        name: name.trim(),
                        phone: phone.trim(),
                        addressLine1: addressLine1.trim(),
                        addressLine2: addressLine2.trim(),
                        city: city.trim(),
                        state: state.trim(),
                        pincode: pincode.trim(),
                    },
                });
                if (isDefault && !initialIsDefault) {
                    await manageAddress({
                        action: 'setDefault',
                        addressIndex,
                    });
                }
            } else {
                await manageAddress({
                    action: 'add',
                    address: {
                        addressType: addressType.toLowerCase(),
                        name: name.trim(),
                        phone: phone.trim(),
                        addressLine1: addressLine1.trim(),
                        addressLine2: addressLine2.trim(),
                        city: city.trim(),
                        state: state.trim(),
                        pincode: pincode.trim(),
                        isDefault,
                    },
                });
            }

            DeviceEventEmitter.emit('addressesUpdated');

            if (isMounted.current && !silent) {
                Alert.alert('Success', mode === 'edit' ? 'Address updated successfully' : 'Address added successfully', [
                    { text: 'OK', onPress: () => closeScreen() }
                ]);
            }
        } catch (err) {
            console.log('Error adding address:', err);
            if (isMounted.current && !silent) {
                Alert.alert('Error', err.message || 'Failed to save address. Please try again.');
            }
        } finally {
            if (isMounted.current) {
                setSaving(false);
            }
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {header()}
                <ScrollView
                    automaticallyAdjustKeyboardInsets={true}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: Sizes.fixPadding * 2 }}
                >
                    {nameField()}
                    {phoneField()}
                    {addressLine1Field()}
                    {addressLine2Field()}
                    {cityStateRow()}
                    {pincodeField()}
                    {addressTypeInfo()}
                    {defaultAddressToggle()}
                </ScrollView>
            </View>
            {addButton()}
        </View>
    )

    function defaultAddressToggle() {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsDefault(!isDefault)}
                style={styles.checkboxRow}
            >
                <View style={[styles.checkbox, isDefault && styles.checkboxSelected]}>
                    {isDefault && <MaterialIcons name="check" size={16} color={Colors.whiteColor} />}
                </View>
                <Text style={{ ...Fonts.blackColor16Regular, marginLeft: Sizes.fixPadding }}>
                    Set as default address
                </Text>
            </TouchableOpacity>
        );
    }

    function addButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                    const isValid = validateForm({ silent: true });
                    if (!isValid) {
                        validateForm();
                        return;
                    }
                    closeScreen();
                    handleAddAddress({ silent: true, skipValidation: true });
                }}
                disabled={saving}
                style={[CommomStyles.buttonStyle, saving && { backgroundColor: Colors.lightGrayColor }]}
            >
                {saving ? (
                    <ActivityIndicator color={Colors.whiteColor} />
                ) : (
                    <Text style={{ ...Fonts.whiteColor19Medium }}>
                        {mode === 'edit' ? 'Update Address' : 'Add Address'}
                    </Text>
                )}
            </TouchableOpacity>
        )
    }

    function addressTypeInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginVertical: Sizes.fixPadding * 2.0 }}>
                <Text style={{ ...Fonts.grayColor15Regular }}>
                    Address Type *
                </Text>
                <SelectDropdown
                    data={addressTypeList}
                    onSelect={(selectedItem, index) => { setAddressType(selectedItem); }}
                    renderButton={(selectedItem, isOpened) => {
                        return (
                            <View style={styles.dropDownWrapStyle}>
                                <Text numberOfLines={1} style={{ ...selectedItem ? { ...Fonts.blackColor17Regular } : { ...Fonts.grayColor17Regular }, flex: 1 }}>
                                    {(selectedItem && selectedItem) || 'Select address type'}
                                </Text>
                                <MaterialIcons name={isOpened ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} color={Colors.blackColor} size={24} />
                            </View>
                        )
                    }}
                    dropdownStyle={{ backgroundColor: Colors.whiteColor }}
                    renderItem={(item) => {
                        return (
                            <View style={{ backgroundColor: Colors.whiteColor, paddingHorizontal: Sizes.fixPadding * 2.0, paddingVertical: Sizes.fixPadding }}>
                                <Text style={{ ...Fonts.blackColor17Regular }}>
                                    {item}
                                </Text>
                            </View>
                        )
                    }}
                />
            </View>
        )
    }

    function pincodeField() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0 }}>
                <Text style={{ ...Fonts.grayColor15Regular }}>
                    Pincode *
                </Text>
                <TextInput
                    placeholder='Enter 6-digit pincode'
                    placeholderTextColor={Colors.grayColor}
                    value={pincode}
                    onChangeText={setPincode}
                    cursorColor={Colors.primaryColor}
                    selectionColor={Colors.primaryColor}
                    style={styles.textFieldStyle}
                    keyboardType="number-pad"
                    maxLength={6}
                />
            </View>
        )
    }

    function cityStateRow() {
        return (
            <View style={{ flexDirection: 'row', marginHorizontal: Sizes.fixPadding * 2.0, marginVertical: Sizes.fixPadding * 2.0 }}>
                <View style={{ flex: 1, marginRight: Sizes.fixPadding }}>
                    <Text style={{ ...Fonts.grayColor15Regular }}>
                        City *
                    </Text>
                    <TextInput
                        placeholder='City'
                        placeholderTextColor={Colors.grayColor}
                        value={city}
                        onChangeText={setCity}
                        cursorColor={Colors.primaryColor}
                        selectionColor={Colors.primaryColor}
                        style={styles.textFieldStyle}
                    />
                </View>
                <View style={{ flex: 1, marginLeft: Sizes.fixPadding }}>
                    <Text style={{ ...Fonts.grayColor15Regular }}>
                        State *
                    </Text>
                    <TextInput
                        placeholder='State'
                        placeholderTextColor={Colors.grayColor}
                        value={state}
                        onChangeText={setState}
                        cursorColor={Colors.primaryColor}
                        selectionColor={Colors.primaryColor}
                        style={styles.textFieldStyle}
                    />
                </View>
            </View>
        )
    }

    function addressLine2Field() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginTop: Sizes.fixPadding * 2.0 }}>
                <Text style={{ ...Fonts.grayColor15Regular }}>
                    Landmark / Area (Optional)
                </Text>
                <TextInput
                    placeholder='Near landmark or area name'
                    placeholderTextColor={Colors.grayColor}
                    value={addressLine2}
                    onChangeText={setAddressLine2}
                    cursorColor={Colors.primaryColor}
                    selectionColor={Colors.primaryColor}
                    style={styles.textFieldStyle}
                />
            </View>
        )
    }

    function addressLine1Field() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginTop: Sizes.fixPadding * 2.0 }}>
                <Text style={{ ...Fonts.grayColor15Regular }}>
                    Address *
                </Text>
                <TextInput
                    placeholder='House no., Building name, Street'
                    placeholderTextColor={Colors.grayColor}
                    value={addressLine1}
                    onChangeText={setAddressLine1}
                    cursorColor={Colors.primaryColor}
                    selectionColor={Colors.primaryColor}
                    style={styles.textFieldStyle}
                    multiline
                />
            </View>
        )
    }

    function phoneField() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginTop: Sizes.fixPadding * 2.0 }}>
                <Text style={{ ...Fonts.grayColor15Regular }}>
                    Phone Number *
                </Text>
                <TextInput
                    placeholder='10-digit phone number'
                    placeholderTextColor={Colors.grayColor}
                    value={phone}
                    onChangeText={setPhone}
                    cursorColor={Colors.primaryColor}
                    selectionColor={Colors.primaryColor}
                    style={styles.textFieldStyle}
                    keyboardType="phone-pad"
                    maxLength={10}
                />
            </View>
        )
    }

    function nameField() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginTop: Sizes.fixPadding }}>
                <Text style={{ ...Fonts.grayColor15Regular }}>
                    Full Name *
                </Text>
                <TextInput
                    placeholder='Enter your full name'
                    placeholderTextColor={Colors.grayColor}
                    value={name}
                    onChangeText={setName}
                    cursorColor={Colors.primaryColor}
                    selectionColor={Colors.primaryColor}
                    style={styles.textFieldStyle}
                />
            </View>
        )
    }

    function header() {
        return (
            <View style={CommomStyles.headerStyle}>
                <MaterialIcons name="keyboard-backspace" size={26} color={Colors.blackColor} onPress={() => { navigation.pop() }} />
                <Text numberOfLines={1} style={{ ...Fonts.blackColor20SemiBold, marginLeft: Sizes.fixPadding * 2.0, }}>
                    Add New Address
                </Text>
            </View>
        )
    }
}

export default AddNewAddressScreen

const styles = StyleSheet.create({
    textFieldStyle: {
        ...Fonts.blackColor17Regular,
        borderBottomColor: Colors.blackColor,
        borderBottomWidth: 1.0,
        padding: 0,
        paddingBottom: Sizes.fixPadding
    },
    dropDownWrapStyle: {
        borderBottomColor: Colors.blackColor,
        paddingBottom: Sizes.fixPadding,
        borderBottomWidth: 1.0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginTop: Sizes.fixPadding,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: Colors.lightGrayColor,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxSelected: {
        backgroundColor: Colors.blackColor,
        borderColor: Colors.blackColor,
    },
})
