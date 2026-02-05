import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image } from 'react-native'
import React, { useState, useCallback } from 'react'
import { Colors, CommomStyles, Fonts, Sizes } from '../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons';
import RangeSlider from 'rn-range-slider';
import MyStatusBar from '../../components/myStatusBar';
import { useLocalSearchParams, useNavigation } from 'expo-router';

const materialsList = [
    { id: '1', material: 'gold', label: 'Gold' },
    { id: '2', material: 'silver', label: 'Silver' },
    { id: '3', material: 'platinum', label: 'Platinum' },
];

const FilterScreen = () => {

    const navigation = useNavigation();
    const params = useLocalSearchParams();

    const [selectedMaterial, setselectedMaterial] = useState('');
    const [lowRange, setlowRange] = useState(0);
    const [highRange, sethighRange] = useState(200);

    React.useEffect(() => {
        const material = params?.material ? String(params.material) : '';
        const minPrice = params?.minPrice ? Number(params.minPrice) : 0;
        const maxPrice = params?.maxPrice ? Number(params.maxPrice) : 200;
        setselectedMaterial(material);
        setlowRange(isNaN(minPrice) ? 0 : minPrice);
        sethighRange(isNaN(maxPrice) ? 200 : maxPrice);
    }, [params?.material, params?.minPrice, params?.maxPrice]);

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {header()}
                <ScrollView automaticallyAdjustKeyboardInsets={true} showsVerticalScrollIndicator={false}>
                    {materialInfo()}
                    {priceRangeInfo()}
                </ScrollView>
                {applyButton()}
            </View>
        </View>
    )

    function applyButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                    navigation.navigate('search/searchScreen', {
                        material: selectedMaterial,
                        minPrice: lowRange,
                        maxPrice: highRange,
                    })
                }}
                style={{ ...CommomStyles.buttonStyle }}
            >
                <Text style={{ ...Fonts.whiteColor19Medium }}>
                    Apply
                </Text>
            </TouchableOpacity>
        )
    }

    function priceRangeInfo() {
        const renderThumb = useCallback(() => <View style={styles.sliderThumbStyle} />, []);
        const renderRail = useCallback(() => <View style={{ backgroundColor: Colors.lightGrayColor, ...styles.sliderStyle }} />, []);
        const renderRailSelected = useCallback(() => <View style={{ backgroundColor: Colors.blackColor, ...styles.sliderStyle }} />, []);
        const renderNotch = useCallback(() => <View />, []);
        const handleValueChange = useCallback((low, high) => {
            setlowRange(low);
            sethighRange(high);
        }, []);
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginBottom: Sizes.fixPadding * 2.0 }}>
                <Text style={{ ...Fonts.primaryColor14Medium }}>
                    PRICE RANGE
                </Text>
                <RangeSlider
                    style={{ marginVertical: Sizes.fixPadding }}
                    min={0}
                    max={500000}
                    step={1}
                    high={highRange}
                    low={lowRange}
                    renderThumb={renderThumb}
                    renderRail={renderRail}
                    renderRailSelected={renderRailSelected}
                    renderNotch={renderNotch}
                    onValueChanged={handleValueChange}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ ...Fonts.grayColor15Regular }}>
                        {`₹`}{Number(lowRange).toFixed(0)}
                    </Text>
                    <Text style={{ ...Fonts.grayColor15Regular }}>
                        {`₹`}{Number(highRange).toFixed(0)}
                    </Text>
                </View>
            </View>
        )
    }

    function materialInfo() {
        return (
            <View style={{ marginVertical: Sizes.fixPadding * 2.0 }}>
                <Text style={{ marginHorizontal: Sizes.fixPadding * 2.0, ...Fonts.primaryColor14Medium, marginBottom: Sizes.fixPadding }}>
                    MATERIAL
                </Text>
                <View style={{ marginHorizontal: Sizes.fixPadding + 5.0, flexDirection: 'row', flexWrap: 'wrap' }}>
                    {
                        materialsList.map((item) => (
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => {
                                    setselectedMaterial(selectedMaterial === item.material ? '' : item.material)
                                }}
                                key={`${item.id}`}
                                style={{
                                    ...styles.searchesWrapStyle,
                                    backgroundColor: selectedMaterial === item.material ? Colors.blackColor : 'transparent'
                                }}
                            >
                                <Text style={selectedMaterial === item.material ? { ...Fonts.whiteColor15Regular } : { ...Fonts.blackColor15Regular }}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))
                    }
                </View>
            </View>
        )
    }

    function header() {
        return (
            <View style={CommomStyles.headerStyle}>
                <Image source={require('../../assets/images/dp-logo-01.png')} style={CommomStyles.headerLogo} />
                <MaterialIcons name="keyboard-backspace" size={26} color={Colors.blackColor} onPress={() => { navigation.pop() }} />
                <Text style={{ ...Fonts.blackColor20SemiBold, marginLeft: Sizes.fixPadding * 2.0, }}>
                    Filters
                </Text>
            </View>
        )
    }
}

export default FilterScreen;

const styles = StyleSheet.create({
    searchesWrapStyle: {
        borderColor: Colors.offWhiteColor,
        marginHorizontal: Sizes.fixPadding - 5.0,
        marginBottom: Sizes.fixPadding,
        borderWidth: 1.0,
        borderRadius: Sizes.fixPadding - 5.0,
        paddingHorizontal: Sizes.fixPadding * 2.0,
        paddingVertical: Sizes.fixPadding - 5.0,
    },
    sliderThumbStyle: {
        elevation: 2.0,
        borderWidth: 2.0,
        borderColor: Colors.whiteColor,
        width: 17.0,
        height: 17.0,
        borderRadius: 8.5,
        backgroundColor: Colors.blackColor
    },
    sliderStyle: {
        borderRadius: Sizes.fixPadding,
        width: '100%',
        height: 6.0,
    }
})
