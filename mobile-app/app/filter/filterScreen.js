import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image } from 'react-native'
import React, { useState, useCallback, useEffect } from 'react'
import { Colors, CommomStyles, Fonts, Sizes } from '../../constants/styles'
import { MaterialIcons } from '@expo/vector-icons';
import RangeSlider from 'rn-range-slider';
import MyStatusBar from '../../components/myStatusBar';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';

// Filter options
const metalTypes = [
    { id: 'gold', label: 'Gold' },
    { id: 'silver', label: 'Silver' },
    { id: 'platinum', label: 'Platinum' },
];

const goldPurities = [
    { id: '14K', label: '14K' },
    { id: '18K', label: '18K' },
    { id: '22K', label: '22K' },
];

const goldColors = [
    { id: 'yellow_gold', label: 'Yellow Gold' },
    { id: 'white_gold', label: 'White Gold' },
    { id: 'rose_gold', label: 'Rose Gold' },
];

const diamondOptions = [
    { id: 'with_diamond', label: 'With Diamond' },
    { id: 'without_diamond', label: 'Without Diamond' },
];

const FilterScreen = () => {

    const navigation = useNavigation();
    const router = useRouter();
    const params = useLocalSearchParams();

    // Filter states
    const [selectedMetal, setSelectedMetal] = useState('');
    const [selectedPurity, setSelectedPurity] = useState('');
    const [selectedGoldColor, setSelectedGoldColor] = useState('');
    const [selectedDiamond, setSelectedDiamond] = useState('');
    const [lowRange, setLowRange] = useState(0);
    const [highRange, setHighRange] = useState(500000);

    // Source page info
    const [fromCategory, setFromCategory] = useState('');

    useEffect(() => {
        // Initialize from params
        const metal = params?.material ? String(params.material) : '';
        const purity = params?.purity ? String(params.purity) : '';
        const goldColor = params?.goldColor ? String(params.goldColor) : '';
        const diamond = params?.diamond ? String(params.diamond) : '';
        const minPrice = params?.minPrice ? Number(params.minPrice) : 0;
        const maxPrice = params?.maxPrice ? Number(params.maxPrice) : 500000;
        const category = params?.category ? String(params.category) : '';

        setSelectedMetal(metal);
        setSelectedPurity(purity);
        setSelectedGoldColor(goldColor);
        setSelectedDiamond(diamond);
        setLowRange(isNaN(minPrice) ? 0 : minPrice);
        setHighRange(isNaN(maxPrice) ? 500000 : maxPrice);
        setFromCategory(category);
    }, [params]);

    const handleApply = () => {
        const filters = {
            material: selectedMetal,
            purity: selectedPurity,
            goldColor: selectedGoldColor,
            diamond: selectedDiamond,
            minPrice: lowRange,
            maxPrice: highRange,
        };

        if (fromCategory) {
            // Navigate back to category page with filters
            navigation.navigate('categoryWiseProducts/categoryWiseProductsScreen', {
                category: fromCategory,
                ...filters,
            });
        } else {
            // Navigate to search with filters
            navigation.navigate('(tabs)/search/searchScreen', filters);
        }
    };

    const handleClear = () => {
        setSelectedMetal('');
        setSelectedPurity('');
        setSelectedGoldColor('');
        setSelectedDiamond('');
        setLowRange(0);
        setHighRange(500000);
    };

    const hasFilters = selectedMetal || selectedPurity || selectedGoldColor || selectedDiamond || lowRange > 0 || highRange < 500000;

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {header()}
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    {metalTypeFilter()}
                    {selectedMetal === 'gold' && goldPurityFilter()}
                    {selectedMetal === 'gold' && goldColorFilter()}
                    {diamondFilter()}
                    {priceRangeFilter()}
                </ScrollView>
                {bottomButtons()}
            </View>
        </View>
    )

    function bottomButtons() {
        return (
            <View style={styles.bottomButtonsContainer}>
                {hasFilters && (
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleClear}
                        style={styles.clearButton}
                    >
                        <Text style={{ ...Fonts.blackColor16Medium }}>
                            Clear All
                        </Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleApply}
                    style={[styles.applyButton, !hasFilters && { flex: 1 }]}
                >
                    <Text style={{ ...Fonts.whiteColor19Medium }}>
                        Apply Filters
                    </Text>
                </TouchableOpacity>
            </View>
        )
    }

    function priceRangeFilter() {
        const renderThumb = useCallback(() => <View style={styles.sliderThumbStyle} />, []);
        const renderRail = useCallback(() => <View style={{ backgroundColor: Colors.lightGrayColor, ...styles.sliderStyle }} />, []);
        const renderRailSelected = useCallback(() => <View style={{ backgroundColor: Colors.blackColor, ...styles.sliderStyle }} />, []);
        const renderNotch = useCallback(() => <View />, []);
        const handleValueChange = useCallback((low, high) => {
            setLowRange(low);
            setHighRange(high);
        }, []);

        return (
            <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>PRICE RANGE</Text>
                <RangeSlider
                    style={{ marginVertical: Sizes.fixPadding }}
                    min={0}
                    max={500000}
                    step={1000}
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
                        ₹{Number(lowRange).toLocaleString('en-IN')}
                    </Text>
                    <Text style={{ ...Fonts.grayColor15Regular }}>
                        ₹{Number(highRange).toLocaleString('en-IN')}
                    </Text>
                </View>
            </View>
        )
    }

    function metalTypeFilter() {
        return (
            <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>METAL TYPE</Text>
                <View style={styles.optionsContainer}>
                    {metalTypes.map((item) => (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                if (selectedMetal === item.id) {
                                    setSelectedMetal('');
                                    // Clear gold-specific filters when deselecting gold
                                    if (item.id === 'gold') {
                                        setSelectedPurity('');
                                        setSelectedGoldColor('');
                                    }
                                } else {
                                    setSelectedMetal(item.id);
                                    // Clear gold-specific filters when selecting non-gold
                                    if (item.id !== 'gold') {
                                        setSelectedPurity('');
                                        setSelectedGoldColor('');
                                    }
                                }
                            }}
                            key={item.id}
                            style={[
                                styles.optionChip,
                                selectedMetal === item.id && styles.optionChipSelected
                            ]}
                        >
                            <Text style={selectedMetal === item.id ? styles.optionTextSelected : styles.optionText}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        )
    }

    function goldPurityFilter() {
        return (
            <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>GOLD PURITY</Text>
                <View style={styles.optionsContainer}>
                    {goldPurities.map((item) => (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => setSelectedPurity(selectedPurity === item.id ? '' : item.id)}
                            key={item.id}
                            style={[
                                styles.optionChip,
                                selectedPurity === item.id && styles.optionChipSelected
                            ]}
                        >
                            <Text style={selectedPurity === item.id ? styles.optionTextSelected : styles.optionText}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        )
    }

    function goldColorFilter() {
        return (
            <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>GOLD COLOR</Text>
                <View style={styles.optionsContainer}>
                    {goldColors.map((item) => (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => setSelectedGoldColor(selectedGoldColor === item.id ? '' : item.id)}
                            key={item.id}
                            style={[
                                styles.optionChip,
                                selectedGoldColor === item.id && styles.optionChipSelected
                            ]}
                        >
                            <View style={[
                                styles.colorIndicator,
                                item.id === 'yellow_gold' && { backgroundColor: '#FFD700' },
                                item.id === 'white_gold' && { backgroundColor: '#E8E8E8' },
                                item.id === 'rose_gold' && { backgroundColor: '#E8A090' },
                            ]} />
                            <Text style={selectedGoldColor === item.id ? styles.optionTextSelected : styles.optionText}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        )
    }

    function diamondFilter() {
        return (
            <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>DIAMOND</Text>
                <View style={styles.optionsContainer}>
                    {diamondOptions.map((item) => (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => setSelectedDiamond(selectedDiamond === item.id ? '' : item.id)}
                            key={item.id}
                            style={[
                                styles.optionChip,
                                selectedDiamond === item.id && styles.optionChipSelected
                            ]}
                        >
                            <Text style={selectedDiamond === item.id ? styles.optionTextSelected : styles.optionText}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        )
    }

    function header() {
        return (
            <View style={styles.headerStyle}>
                <MaterialIcons name="keyboard-backspace" size={26} color={Colors.blackColor} onPress={() => navigation.pop()} />
                <TouchableOpacity onPress={() => router.replace('/(tabs)/home/homeScreen')} activeOpacity={0.7}>
                    <Image source={require('../../assets/images/dp-logo-02.png')} style={CommomStyles.headerLogo} />
                </TouchableOpacity>
                <View style={{ width: 26 }} />
            </View>
        )
    }
}

export default FilterScreen;

const styles = StyleSheet.create({
    headerStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Sizes.fixPadding * 2.0,
        paddingVertical: Sizes.fixPadding,
        borderBottomColor: Colors.offWhiteColor,
        borderBottomWidth: 1.0,
    },
    filterSection: {
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginTop: Sizes.fixPadding * 2.0,
    },
    filterTitle: {
        ...Fonts.primaryColor14Medium,
        marginBottom: Sizes.fixPadding,
        letterSpacing: 0.5,
    },
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    optionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderColor: Colors.offWhiteColor,
        borderWidth: 1.0,
        borderRadius: Sizes.fixPadding - 5.0,
        paddingHorizontal: Sizes.fixPadding + 5,
        paddingVertical: Sizes.fixPadding - 3,
        marginRight: Sizes.fixPadding,
        marginBottom: Sizes.fixPadding,
    },
    optionChipSelected: {
        backgroundColor: Colors.blackColor,
        borderColor: Colors.blackColor,
    },
    optionText: {
        ...Fonts.blackColor15Regular,
    },
    optionTextSelected: {
        ...Fonts.whiteColor15Regular,
    },
    colorIndicator: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: Sizes.fixPadding - 5,
        borderWidth: 1,
        borderColor: Colors.lightGrayColor,
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
    },
    bottomButtonsContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        paddingHorizontal: Sizes.fixPadding * 2.0,
        paddingVertical: Sizes.fixPadding,
        backgroundColor: Colors.whiteColor,
        borderTopColor: Colors.offWhiteColor,
        borderTopWidth: 1,
    },
    clearButton: {
        flex: 0.4,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: Colors.blackColor,
        borderWidth: 1,
        borderRadius: Sizes.fixPadding,
        paddingVertical: Sizes.fixPadding + 2,
        marginRight: Sizes.fixPadding,
    },
    applyButton: {
        flex: 0.6,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.blackColor,
        borderRadius: Sizes.fixPadding,
        paddingVertical: Sizes.fixPadding + 2,
    },
})
