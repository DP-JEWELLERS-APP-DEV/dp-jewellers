import { StyleSheet, Text, View, Animated, Image } from 'react-native'
import React, { useState, useRef } from 'react'
import { Colors, Fonts, Screen, Sizes, CommomStyles } from '../../constants/styles'
import { SwipeListView } from 'react-native-swipe-list-view';
import { Snackbar } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import MyStatusBar from '../../components/myStatusBar';
import { useNavigation } from 'expo-router';

const notificatiosList = [
    {
        key: '1',
        title: 'Biggest Sale of the Year !',
        description: 'Lorem ipsum dolor sit amet, consectetur eliadipiscing elit. Auctor enim, sit quam.',
    },
    {
        key: '2',
        title: '25% Off on Diamond Jewellery.',
        description: 'Lorem ipsum dolor sit amet, consectetur eliadipiscing elit. Auctor enim, sit quam.',
    },
];

const rowTranslateAnimatedValues = {};

const NotificationsScreen = () => {

    const navigation = useNavigation();

    const [showSnackBar, setShowSnackBar] = useState(false);

    const [snackBarMsg, setSnackBarMsg] = useState('');

    const [listData, setListData] = useState(notificatiosList);

    Array(listData.length + 1)
        .fill('')
        .forEach((_, i) => {
            rowTranslateAnimatedValues[`${i}`] = new Animated.Value(1);
        });

    const animationIsRunning = useRef(false);

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1, }}>
                {header()}
                {notifications()}
            </View>
            {snackBar()}
        </View>
    )

    function notifications() {
        return (
            listData.length == 0
                ?
                noNotoficationInfo()
                :
                notificationsInfo()
        )
    }

    function snackBar() {
        return (
            <Snackbar
                style={CommomStyles.snackBarStyle}
                visible={showSnackBar}
                elevation={0.0}
                onDismiss={() => setShowSnackBar(false)}
            >
                <Text style={{ ...Fonts.whiteColor16Medium }}>
                    {snackBarMsg}
                </Text>
            </Snackbar>
        )
    }

    function notificationsInfo() {
        const onSwipeValueChange = swipeData => {
            const { key, value } = swipeData;
            if ((value > Screen.width) || (value < -Screen.width) && !animationIsRunning.current) {
                animationIsRunning.current = true;
                Animated.timing(rowTranslateAnimatedValues[key], {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: false,
                }).start(() => {
                    const newData = [...listData];
                    const prevIndex = listData.findIndex(item => item.key === key);
                    newData.splice(prevIndex, 1);
                    const removedItem = listData.find(item => item.key === key);
                    setSnackBarMsg(`${removedItem.title} Dismissed!`);
                    setListData(newData);
                    setShowSnackBar(true);
                    animationIsRunning.current = false;
                });
            }
        };

        const renderItem = (data) => (
            <Animated.View
                style={[
                    {
                        height: rowTranslateAnimatedValues[
                            data.item.key
                        ].interpolate({
                            inputRange: ['0%', '100%'],
                            outputRange: ["0%", "100%"],
                        }),
                    },
                ]}
            >
                <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
                    <View style={{ flexDirection: 'row', marginHorizontal: Sizes.fixPadding * 2.0, marginBottom: Sizes.fixPadding * 2.0, }}>
                        <View style={styles.notificationIconWrapStyle}>
                            <MaterialCommunityIcons name="bell-badge-outline" size={24} color={Colors.whiteColor} />
                        </View>
                        <View style={{ flex: 1, marginLeft: Sizes.fixPadding + 5.0, }}>
                            <Text numberOfLines={1} style={{ ...Fonts.blackColor18Regular, }}>
                                {data.item.title}
                            </Text>
                            <Text numberOfLines={2} style={{ marginTop: Sizes.fixPadding - 7.0, ...Fonts.grayColor15Regular }}>
                                {data.item.description}
                            </Text>
                        </View>
                    </View>
                </View>
            </Animated.View>
        );

        const renderHiddenItem = () => (
            <View style={styles.rowBack} />
        );

        return (
            <SwipeListView
                data={listData}
                renderItem={renderItem}
                renderHiddenItem={renderHiddenItem}
                rightOpenValue={-Screen.width}
                leftOpenValue={Screen.width}
                onSwipeValueChange={onSwipeValueChange}
                useNativeDriver={false}
                contentContainerStyle={{ paddingTop: Sizes.fixPadding * 2.0, }}
                showsVerticalScrollIndicator={false}
            />
        )
    }

    function noNotoficationInfo() {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Image
                    source={require('../../assets/images/icons/notification.png')}
                    style={{ width: 26, height: 26, resizeMode: 'contain', tintColor: Colors.lightGrayColor }}
                />
                <Text style={{ ...Fonts.lightGrayColor18SemiBold, color: Colors.lightGrayColor, marginTop: Sizes.fixPadding - 5.0 }}>
                    No Notification Here
                </Text>
            </View>
        )
    }

    function header() {
        return (
            <View style={CommomStyles.headerStyle}>
                <MaterialIcons name="keyboard-backspace" size={26} color={Colors.blackColor} onPress={() => { navigation.pop() }} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Image source={require('../../assets/images/dp-logo-02.png')} style={CommomStyles.headerLogo} />
                </View>
                <View style={{ width: 26 }} />
            </View>
        )
    }
}

export default NotificationsScreen

const styles = StyleSheet.create({
    rowBack: {
        backgroundColor: Colors.blackColor,
        flex: 1,
        marginBottom: Sizes.fixPadding * 2.0,
    },
    notificationIconWrapStyle: {
        width: 50.0,
        height: 50.0,
        borderRadius: 25.0,
        backgroundColor: Colors.blackColor,
        alignItems: 'center',
        justifyContent: 'center'
    },
})
