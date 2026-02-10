import { StyleSheet, Text, View, Image, FlatList, TouchableOpacity, Platform, ActivityIndicator, ScrollView, DeviceEventEmitter } from 'react-native'
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Colors, Fonts, Sizes, Screen, CommomStyles } from '../../constants/styles'
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import { Snackbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MyStatusBar from '../../components/myStatusBar';
import { useLocalSearchParams, useNavigation, useRouter, useFocusEffect } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../../lib/firebase';

const fallbackImage = require('../../assets/images/jewellery/jewellary15.png');

const ProductDetailScreen = () => {

    const navigation = useNavigation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { productId } = useLocalSearchParams();

    const [selectedSize, setselectedSize] = useState('');
    const [selectedGoldOption, setSelectedGoldOption] = useState('');
    const [selectedPurity, setSelectedPurity] = useState('');
    const [selectedDiamondQuality, setSelectedDiamondQuality] = useState('');
    const [variantPricing, setVariantPricing] = useState(null);
    const [pricingLoading, setPricingLoading] = useState(false);
    const [isFavorite, setisFavorite] = useState(false);
    const [showSnackBar, setshowSnackBar] = useState(false);
    const [snackText, setsnackText] = useState('');
    const [addedToCart, setAddedToCart] = useState(false);
    const [product, setproduct] = useState(null);
    const [loading, setloading] = useState(true);
    const [errorText, seterrorText] = useState('');
    const [activeIndex, setactiveIndex] = useState(0);

    // Collapsible section states
    const [showProductDetails, setShowProductDetails] = useState(false);
    const [showDiamondDetails, setShowDiamondDetails] = useState(false);
    const [showMetalDetails, setShowMetalDetails] = useState(false);
    const [showPriceBreakup, setShowPriceBreakup] = useState(false);

    const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 60 });
    const lastTrackedViewRef = useRef(null);
    const onViewRef = useRef(({ viewableItems }) => {
        if (viewableItems && viewableItems.length > 0) {
            setactiveIndex(viewableItems[0].index || 0);
        }
    });

    useEffect(() => {
        let active = true;
        const fetchProduct = async () => {
            if (!productId) {
                seterrorText('Product not found.');
                setloading(false);
                return;
            }
            setloading(true);
            seterrorText('');
            try {
                const getProduct = httpsCallable(functions, 'getProduct');
                const res = await getProduct({ productId });
                if (active) {
                    setproduct(res.data);
                    const cfg = res.data?.configurator;
                    if (cfg?.enabled && cfg.configurableMetal) {
                        const cm = cfg.configurableMetal;
                        const defaultVariant = cm.variants?.find(v => v.purity === cm.defaultPurity) || cm.variants?.[0];
                        setSelectedPurity(cm.defaultPurity || defaultVariant?.purity || '');
                        if (defaultVariant) {
                            setSelectedDiamondQuality(defaultVariant.defaultDiamondQuality || '');
                            setSelectedGoldOption(defaultVariant.defaultColor || '');
                            setselectedSize(defaultVariant.defaultSize || '');
                        }
                    } else {
                        if (res.data?.defaultSize) {
                            setselectedSize(res.data.defaultSize);
                        } else if (res.data?.sizes?.length) {
                            setselectedSize(res.data.sizes[0]);
                        }
                        // Set default gold option
                        const goldOptions = res.data?.goldOptions || res.data?.metals?.[0]?.goldOptions || [];
                        if (goldOptions.length > 0) {
                            setSelectedGoldOption(goldOptions[0]);
                        }
                    }
                }
            } catch (err) {
                if (active) {
                    seterrorText('Failed to load product.');
                }
            } finally {
                if (active) setloading(false);
            }
        };
        fetchProduct();
        return () => { active = false; };
    }, [productId]);

    useEffect(() => {
        if (!auth?.currentUser || !productId || !product?.category) return;
        if (lastTrackedViewRef.current === String(productId)) return;
        lastTrackedViewRef.current = String(productId);
        const trackUserActivity = httpsCallable(functions, 'trackUserActivity');
        trackUserActivity({
            type: 'view',
            productId,
            category: product.category,
        }).catch(() => {
            // Ignore tracking errors
        });
    }, [productId, product?.category]);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            const checkCartStatus = async () => {
                if (!auth?.currentUser || !productId) {
                    if (active) setAddedToCart(false);
                    return;
                }
                try {
                    const getCart = httpsCallable(functions, 'getCart');
                    const res = await getCart();
                    const cartItems = res?.data?.cart || [];
                    const exists = cartItems.some((item) => item.productId === productId);
                    if (active) setAddedToCart(exists);
                } catch (err) {
                    if (active) setAddedToCart(false);
                }
            };
            checkCartStatus();
            return () => { active = false; };
        }, [productId])
    );

    // Check favorites status on screen focus - this ensures heart icon persists on refresh
    useFocusEffect(
        useCallback(() => {
            const checkFavoriteStatus = async () => {
                if (!productId || !auth?.currentUser) {
                    setisFavorite(false);
                    return;
                }
                try {
                    const getFavorites = httpsCallable(functions, 'getFavorites');
                    const favRes = await getFavorites();
                    const favList = favRes?.data?.favorites || [];
                    // Ensure proper string comparison for productId
                    const isFav = favList.some(f => String(f.productId) === String(productId));
                    setisFavorite(isFav);
                } catch (e) {
                    // Ignore favorites fetch error
                }
            };
            checkFavoriteStatus();
        }, [productId])
    );

    const formatGoldOption = (option) => {
        const map = {
            'yellow_gold': 'Yellow Gold',
            'white_gold': 'White Gold',
            'rose_gold': 'Rose Gold',
        };
        return map[option] || option;
    };

    const fetchVariantPrice = async (purity, quality, size) => {
        if (!productId) return;
        setPricingLoading(true);
        try {
            const calc = httpsCallable(functions, 'calculateVariantPrice');
            const res = await calc({
                productId,
                selectedPurity: purity,
                selectedDiamondQuality: quality,
                selectedSize: size,
            });
            setVariantPricing(res.data);
        } catch (err) {
            // Ignore errors for now
        } finally {
            setPricingLoading(false);
        }
    };

    useEffect(() => {
        if (!product?.configurator?.enabled) {
            setVariantPricing(null);
            return;
        }
        if (!selectedPurity) return;
        const t = setTimeout(() => {
            fetchVariantPrice(selectedPurity, selectedDiamondQuality, selectedSize);
        }, 300);
        return () => clearTimeout(t);
    }, [product?.configurator?.enabled, selectedPurity, selectedDiamondQuality, selectedSize, productId]);

    // Helper: get the currently selected purity variant
    const getCurrentVariant = () => {
        const cfg = product?.configurator;
        if (!cfg?.enabled || !cfg.configurableMetal) return null;
        return cfg.configurableMetal.variants?.find(v => v.purity === selectedPurity)
            || cfg.configurableMetal.variants?.[0]
            || null;
    };

    // Cascade selections when purity changes
    useEffect(() => {
        const cfg = product?.configurator;
        if (!cfg?.enabled || !cfg.configurableMetal) return;
        const variant = cfg.configurableMetal.variants?.find(v => v.purity === selectedPurity);
        if (!variant) return;

        // If current color not available in new variant, use variant default
        const availableColors = variant.availableColors || [];
        if (availableColors.length > 0 && !availableColors.includes(selectedGoldOption)) {
            setSelectedGoldOption(variant.defaultColor || availableColors[0] || '');
        }

        // If current diamond quality not available, use variant default
        const availableDQ = variant.availableDiamondQualities || [];
        if (availableDQ.length > 0 && !availableDQ.includes(selectedDiamondQuality)) {
            setSelectedDiamondQuality(variant.defaultDiamondQuality || availableDQ[0] || '');
        }

        // If current size not available, use variant default
        const availableSizes = (variant.sizes || []).map(s => s.size);
        if (availableSizes.length > 0 && !availableSizes.includes(selectedSize)) {
            setselectedSize(variant.defaultSize || availableSizes[0] || '');
        }
    }, [selectedPurity, product]);

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {loading ? (
                    <View style={styles.centerWrap}>
                        <ActivityIndicator color={Colors.primaryColor} />
                    </View>
                ) : errorText ? (
                    <View style={styles.centerWrap}>
                        <Text style={styles.errorText}>{errorText}</Text>
                    </View>
                ) : (
                    <>
                        {header()}
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}>
                            {productImage()}
                            {productNameAndPriceInfo()}
                            {puritySelector()}
                            {goldOptionsInfo()}
                            {diamondQualitySelector()}
                            {productSizeInfo()}
                            {productDescriptionInfo()}
                            {collapsibleSections()}
                        </ScrollView>
                        {addToCartButton()}
                        {snackBar()}
                    </>
                )}
            </View>
        </View>
    )

    function snackBar() {
        return (
            <Snackbar
                visible={showSnackBar}
                onDismiss={() => { setshowSnackBar(false) }}
                elevation={0.0}
                style={CommomStyles.snackBarStyle}
            >
                <Text style={{ ...Fonts.whiteColor16Medium }}>
                    {snackText}
                </Text>
            </Snackbar>
        )
    }

    function addToCartButton() {
        return (
            <View style={[styles.bottomButtonContainer, { paddingBottom: Sizes.fixPadding + insets.bottom }]}>
                <TouchableOpacity
                    activeOpacity={0.5}
                    onPress={() => {
                        if (addedToCart) {
                            router.push('/(tabs)/cart/cartScreen');
                        } else {
                            handleAddToCart();
                        }
                    }}
                    style={styles.addToCartButton}
                >
                    <Feather name="shopping-bag" size={20} color={Colors.whiteColor} style={{ marginRight: 8 }} />
                    <Text style={{ ...Fonts.whiteColor19Medium }}>
                        {addedToCart ? 'Go to Cart' : 'Add to Cart'}
                    </Text>
                </TouchableOpacity>
            </View>
        )
    }

    function productImage() {
        const imageList = (product?.images || []).map((img) => ({
            image: img?.url || img,
        }));
        const finalImages = imageList.length ? imageList : [{ image: fallbackImage }];
        const isRemote = imageList.length > 0;
        return (
            <View style={{ height: Screen.height / 2.8 }}>
                <FlatList
                    data={finalImages}
                    keyExtractor={(_, index) => `${index}`}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onViewableItemsChanged={onViewRef.current}
                    viewabilityConfig={viewConfigRef.current}
                    renderItem={({ item }) => (
                        <View style={{ width: Screen.width }}>
                            <Image
                                source={isRemote ? { uri: item.image } : item.image}
                                style={styles.productImageStyle}
                            />
                        </View>
                    )}
                />
                <View style={styles.dotsWrap}>
                    {finalImages.map((_, idx) => (
                        <View
                            key={`${idx}`}
                            style={[
                                styles.dotStyle,
                                idx === activeIndex ? styles.dotActive : styles.dotInactive,
                            ]}
                        />
                    ))}
                </View>
            </View>
        )
    }

    function collapsibleSections() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginTop: Sizes.fixPadding }}>
                {productDetailsSection()}
                {product?.diamond?.hasDiamond && diamondDetailsSection()}
                {metalDetailsSection()}
                {priceBreakupSection()}
            </View>
        )
    }

    function productDetailsSection() {
        const metal = product?.metal || product?.metals?.[0] || {};
        return (
            <View style={styles.collapsibleSection}>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowProductDetails(!showProductDetails)}
                    style={styles.collapsibleHeader}
                >
                    <Text style={styles.collapsibleTitle}>PRODUCT DETAILS</Text>
                    <Ionicons
                        name={showProductDetails ? "remove" : "add"}
                        size={20}
                        color={Colors.primaryColor}
                    />
                </TouchableOpacity>
                {showProductDetails && (
                    <View style={styles.collapsibleContent}>
                        <DetailRow label="Product Code" value={product?.productCode || '-'} />
                        {product?.dimensions?.height && (
                            <DetailRow label="Height" value={`${product.dimensions.height} mm`} />
                        )}
                        {product?.dimensions?.width && (
                            <DetailRow label="Width" value={`${product.dimensions.width} mm`} />
                        )}
                        {product?.dimensions?.length && (
                            <DetailRow label="Length" value={`${product.dimensions.length} inches`} />
                        )}
                        <DetailRow
                            label="Product Weight"
                            value={variantPricing?.totalNetWeight ? `${variantPricing.totalNetWeight} gram` : (metal?.grossWeight ? `${metal.grossWeight} gram` : (metal?.netWeight ? `${metal.netWeight} gram` : '-'))}
                        />
                        {product?.certifications?.certificateNumber && (
                            <DetailRow label="HUID Number" value={product.certifications.certificateNumber} />
                        )}
                    </View>
                )}
            </View>
        )
    }

    function diamondDetailsSection() {
        const diamond = product?.diamond || {};
        const variants = diamond?.variants || [];
        const totalCount = diamond?.totalCount || variants.reduce((sum, v) => sum + (v.count || 0), 0);
        const totalWeight = diamond?.totalCaratWeight || variants.reduce((sum, v) => sum + (v.caratWeight || 0), 0);

        return (
            <View style={styles.collapsibleSection}>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowDiamondDetails(!showDiamondDetails)}
                    style={styles.collapsibleHeader}
                >
                    <Text style={styles.collapsibleTitle}>DIAMOND DETAILS</Text>
                    <Ionicons
                        name={showDiamondDetails ? "remove" : "add"}
                        size={20}
                        color={Colors.primaryColor}
                    />
                </TouchableOpacity>
                {showDiamondDetails && (
                    <View style={styles.collapsibleContent}>
                        <DetailRow label="Total Weight" value={`${totalWeight} Ct`} highlight />
                        <DetailRow label="Total No. Of Diamonds" value={`${totalCount}`} />
                        {variantPricing?.diamondQuality && (
                            <DetailRow label="Quality" value={String(variantPricing.diamondQuality).replace('_', '-')} />
                        )}

                        {variants.length > 0 && (
                            <View style={styles.diamondVariantsTable}>
                                <View style={styles.tableHeader}>
                                    <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>Count</Text>
                                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>Shape</Text>
                                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>Weight</Text>
                                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>Setting</Text>
                                </View>
                                {variants.map((v, idx) => (
                                    <View key={idx} style={styles.tableRow}>
                                        <Text style={[styles.tableCell, { flex: 0.8 }]}>{v.count || '-'}</Text>
                                        <Text style={[styles.tableCell, { flex: 1 }]}>{v.shape || '-'}</Text>
                                        <Text style={[styles.tableCell, { flex: 1 }]}>{v.caratWeight ? `${v.caratWeight} ct` : '-'}</Text>
                                        <Text style={[styles.tableCell, { flex: 1 }]}>{v.settingType || '-'}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {diamond?.certification && (
                            <DetailRow label="Certification" value={diamond.certification} />
                        )}
                    </View>
                )}
            </View>
        )
    }

    function metalDetailsSection() {
        const metals = product?.metals || [];
        const metal = product?.metal || metals[0] || {};
        const isConfigurator = product?.configurator?.enabled;
        const metalBreakdown = variantPricing?.metalBreakdown || [];

        const formatMetalType = (type, purity) => {
            if (!type) return '-';
            let formatted = type.charAt(0).toUpperCase() + type.slice(1);
            if (purity) {
                formatted = `${purity} ${formatted}`;
            }
            if (selectedGoldOption) {
                formatted += ` (${formatGoldOption(selectedGoldOption)})`;
            }
            return formatted;
        };

        return (
            <View style={styles.collapsibleSection}>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowMetalDetails(!showMetalDetails)}
                    style={styles.collapsibleHeader}
                >
                    <Text style={styles.collapsibleTitle}>METAL DETAILS</Text>
                    <Ionicons
                        name={showMetalDetails ? "remove" : "add"}
                        size={20}
                        color={Colors.primaryColor}
                    />
                </TouchableOpacity>
                {showMetalDetails && (
                    <View style={styles.collapsibleContent}>
                        {isConfigurator && metalBreakdown.length > 0 ? (
                            metalBreakdown.map((m, idx) => (
                                <View key={idx}>
                                    {idx > 0 && <View style={styles.metalDivider} />}
                                    <DetailRow
                                        label="Type"
                                        value={formatMetalType(m.type, m.purity)}
                                    />
                                    <DetailRow
                                        label="Weight"
                                        value={m.netWeight ? `${m.netWeight} gram` : '-'}
                                    />
                                    <DetailRow
                                        label="Rate"
                                        value={m.ratePerGram ? `₹ ${Number(m.ratePerGram).toLocaleString('en-IN')}/g` : '-'}
                                    />
                                </View>
                            ))
                        ) : metals.length > 1 ? (
                            metals.map((m, idx) => (
                                <View key={idx}>
                                    {idx > 0 && <View style={styles.metalDivider} />}
                                    <DetailRow
                                        label="Type"
                                        value={formatMetalType(m.type, m.purity || m.silverType)}
                                    />
                                    <DetailRow
                                        label="Weight"
                                        value={m.netWeight ? `${m.netWeight} gram` : '-'}
                                    />
                                </View>
                            ))
                        ) : (
                            <>
                                <DetailRow
                                    label="Type"
                                    value={formatMetalType(metal.type, metal.purity || metal.silverType)}
                                />
                                <DetailRow
                                    label="Weight"
                                    value={metal.netWeight ? `${metal.netWeight} gram` : '-'}
                                />
                            </>
                        )}
                    </View>
                )}
            </View>
        )
    }

    function priceBreakupSection() {
        const pricing = variantPricing || product?.pricing || {};
        const metalValue = pricing.metalValue || 0;
        const diamondValue = pricing.diamondValue || 0;
        const makingChargeAmount = pricing.makingChargeAmount || 0;
        const wastageChargeAmount = pricing.wastageChargeAmount || 0;
        const stoneSettingCharges = pricing.stoneSettingCharges || 0;
        const designCharges = pricing.designCharges || 0;
        const taxAmount = pricing.taxAmount || 0;
        const discount = pricing.discount || 0;
        const finalPrice = pricing.finalPrice || 0;

        return (
            <View style={styles.collapsibleSection}>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowPriceBreakup(!showPriceBreakup)}
                    style={styles.collapsibleHeader}
                >
                    <Text style={styles.collapsibleTitle}>PRICE BREAKUP</Text>
                    <Ionicons
                        name={showPriceBreakup ? "remove" : "add"}
                        size={20}
                        color={Colors.primaryColor}
                    />
                </TouchableOpacity>
                {showPriceBreakup && (
                    <View style={styles.collapsibleContent}>
                        {metalValue > 0 && (
                            <PriceRow label="Metal Value" value={metalValue} />
                        )}
                        {diamondValue > 0 && (
                            <PriceRow label="Diamond" value={diamondValue} />
                        )}
                        {(makingChargeAmount > 0 || wastageChargeAmount > 0) && (
                            <PriceRow label="Making Charges" value={makingChargeAmount + wastageChargeAmount} />
                        )}
                        {stoneSettingCharges > 0 && (
                            <PriceRow label="Stone Setting" value={stoneSettingCharges} />
                        )}
                        {designCharges > 0 && (
                            <PriceRow label="Design Charges" value={designCharges} />
                        )}
                        {taxAmount > 0 && (
                            <PriceRow label="GST" value={taxAmount} />
                        )}
                        {discount > 0 && (
                            <PriceRow label="Discount" value={-discount} isDiscount />
                        )}
                        <View style={styles.totalPriceRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>
                                {`₹ ${Number(finalPrice).toLocaleString('en-IN')}/-`}
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        )
    }

    function DetailRow({ label, value, highlight }) {
        return (
            <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, highlight && styles.highlightLabel]}>{label}</Text>
                <Text style={[styles.detailValue, highlight && styles.highlightValue]}>{value}</Text>
            </View>
        )
    }

    function PriceRow({ label, value, isDiscount }) {
        return (
            <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{label}</Text>
                <Text style={[styles.priceValue, isDiscount && styles.discountValue]}>
                    {isDiscount ? `- ₹ ${Math.abs(value).toLocaleString('en-IN')}/-` : `₹ ${Number(value).toLocaleString('en-IN')}/-`}
                </Text>
            </View>
        )
    }

    function productDescriptionInfo() {
        const description = product?.description || '';
        if (!description) return null;
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginTop: Sizes.fixPadding }}>
                <Text style={{ ...Fonts.blackColor16Medium, marginBottom: Sizes.fixPadding - 5 }}>
                    Description
                </Text>
                <Text style={{ ...Fonts.grayColor15Regular, lineHeight: 22.0 }}>
                    {description}
                </Text>
            </View>
        )
    }

    function puritySelector() {
        const cfg = product?.configurator;
        if (!cfg?.enabled || !cfg.configurableMetal) return null;
        const variants = cfg.configurableMetal.variants || [];
        if (variants.length === 0) return null;

        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginTop: Sizes.fixPadding }}>
                <Text style={{ ...Fonts.blackColor16Medium, marginBottom: Sizes.fixPadding - 5 }}>
                    Metal Purity
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {variants.map((v) => (
                        <TouchableOpacity
                            key={v.purity}
                            activeOpacity={0.8}
                            onPress={() => setSelectedPurity(v.purity)}
                            style={[
                                styles.pillChip,
                                selectedPurity === v.purity && styles.pillChipSelected
                            ]}
                        >
                            <Text style={[
                                styles.pillChipText,
                                selectedPurity === v.purity && styles.pillChipTextSelected
                            ]}>
                                {v.purity}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        )
    }

    function diamondQualitySelector() {
        const cfg = product?.configurator;
        if (!cfg?.enabled || !product?.diamond?.hasDiamond) return null;
        const variant = getCurrentVariant();
        const qualities = variant?.availableDiamondQualities || [];
        if (qualities.length <= 1) return null;
        const formatQuality = (q) => String(q || '').replace('_', '-');

        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginTop: Sizes.fixPadding }}>
                <Text style={{ ...Fonts.blackColor16Medium, marginBottom: Sizes.fixPadding - 5 }}>
                    Diamond Quality
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {qualities.map((q) => (
                        <TouchableOpacity
                            key={q}
                            activeOpacity={0.8}
                            onPress={() => setSelectedDiamondQuality(q)}
                            style={[
                                styles.pillChip,
                                selectedDiamondQuality === q && styles.pillChipSelected
                            ]}
                        >
                            <Text style={[
                                styles.pillChipText,
                                selectedDiamondQuality === q && styles.pillChipTextSelected
                            ]}>
                                {formatQuality(q)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        )
    }

    function goldOptionsInfo() {
        const cfg = product?.configurator;
        let goldOptions;
        if (cfg?.enabled && cfg.configurableMetal) {
            const variant = getCurrentVariant();
            goldOptions = variant?.availableColors || [];
        } else {
            goldOptions = product?.goldOptions || product?.metals?.[0]?.goldOptions || [];
        }
        if (goldOptions.length === 0) return null;

        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginTop: Sizes.fixPadding }}>
                <Text style={{ ...Fonts.blackColor16Medium, marginBottom: Sizes.fixPadding - 5 }}>
                    Gold Options
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {goldOptions.map((option) => (
                        <TouchableOpacity
                            key={option}
                            activeOpacity={0.8}
                            onPress={() => setSelectedGoldOption(option)}
                            style={[
                                styles.goldOptionChip,
                                selectedGoldOption === option && styles.goldOptionChipSelected
                            ]}
                        >
                            <View style={[
                                styles.goldColorIndicator,
                                option === 'yellow_gold' && { backgroundColor: '#FFD700' },
                                option === 'white_gold' && { backgroundColor: '#E8E8E8' },
                                option === 'rose_gold' && { backgroundColor: '#E8A090' },
                            ]} />
                            <Text style={[
                                styles.goldOptionText,
                                selectedGoldOption === option && styles.goldOptionTextSelected
                            ]}>
                                {formatGoldOption(option)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        )
    }

    function productSizeInfo() {
        const cfg = product?.configurator;
        let sizes;
        let weightNote = null;

        if (cfg?.enabled && cfg.configurableMetal) {
            const variant = getCurrentVariant();
            const variantSizes = variant?.sizes || [];
            sizes = variantSizes.map(s => s.size);
            if (selectedSize && variantSizes.length > 0) {
                const sizeEntry = variantSizes.find(s => s.size === selectedSize);
                if (sizeEntry) {
                    weightNote = `Gold weight: ${sizeEntry.netWeight}g for size ${selectedSize}`;
                }
            }
        } else {
            const sw = product?.sizeWeights || [];
            if (sw.length > 0) {
                sizes = sw.map(s => s.size);
                if (selectedSize) {
                    const sizeEntry = sw.find(s => s.size === selectedSize);
                    if (sizeEntry && sizeEntry.netWeight) {
                        weightNote = `Weight: ${sizeEntry.netWeight}g for size ${selectedSize}`;
                    }
                }
            } else {
                sizes = product?.sizes || [];
            }
        }

        if (!sizes || !sizes.length) return null;
        const renderItem = ({ item }) => (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { setselectedSize(item) }}
                style={{
                    ...styles.productSizeBoxStyle,
                    backgroundColor: selectedSize == item ? Colors.primaryColor : 'transparent'
                }}>
                <Text style={selectedSize == item ? { ...Fonts.whiteColor15Regular } : { ...Fonts.grayColor15Regular, }}>
                    {item}
                </Text>
            </TouchableOpacity >
        )
        return (
            <View style={{ marginTop: Sizes.fixPadding }}>
                <Text style={{ marginHorizontal: Sizes.fixPadding * 2.0, ...Fonts.blackColor16Medium, marginBottom: Sizes.fixPadding - 5 }}>
                    Size
                </Text>
                <FlatList
                    data={sizes}
                    keyExtractor={(item, index) => `${item}${index}`}
                    renderItem={renderItem}
                    horizontal
                    contentContainerStyle={{ paddingHorizontal: Sizes.fixPadding + 3.0 }}
                    showsHorizontalScrollIndicator={false}
                />
                {weightNote && (
                    <Text style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginTop: Sizes.fixPadding - 5, ...Fonts.grayColor14Regular }}>
                        {weightNote}
                    </Text>
                )}
            </View>
        )
    }

    function productNameAndPriceInfo() {
        return (
            <View style={{ marginHorizontal: Sizes.fixPadding * 2.0, marginTop: Sizes.fixPadding }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: Sizes.fixPadding }}>
                        <Text numberOfLines={2} style={{ ...Fonts.blackColor18Medium }}>
                            {product?.name || 'Product'}
                        </Text>
                        <Text style={{ ...Fonts.grayColor13Medium, marginTop: 2 }}>
                            {product?.category || ''}{product?.subCategory ? ` • ${product.subCategory}` : ''}
                        </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ ...Fonts.primaryColor18Bold }}>
                            {`₹ ${Number(variantPricing?.finalPrice || product?.pricing?.finalPrice || 0).toLocaleString('en-IN')}`}
                        </Text>
                        {pricingLoading && (
                            <ActivityIndicator size="small" color={Colors.primaryColor} style={{ marginTop: 4 }} />
                        )}
                    </View>
                </View>
                {product?.productCode && (
                    <Text style={{ ...Fonts.grayColor14Regular, marginTop: 4 }}>
                        SKU: {product.productCode}
                    </Text>
                )}
            </View>
        )
    }

    function header() {
        return (
            <View style={styles.headerWrapStyle}>
                <MaterialIcons
                    name="keyboard-backspace"
                    size={26}
                    color={Colors.blackColor}
                    onPress={() => { navigation.canGoBack() ? navigation.goBack() : router.replace('/(tabs)/home/homeScreen') }}
                />
                <TouchableOpacity onPress={() => router.replace('/(tabs)/home/homeScreen')} activeOpacity={0.7} style={{ flex: 1, alignItems: 'center' }}>
                    <Image source={require('../../assets/images/dp-logo-02.png')} style={CommomStyles.headerLogo} />
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons
                        name={isFavorite ? "favorite" : "favorite-border"}
                        size={23}
                        color={isFavorite ? Colors.redColor : Colors.blackColor}
                        style={{ marginRight: Sizes.fixPadding + 5 }}
                        onPress={toggleFavorite}
                    />
                    <Feather
                        name="shopping-bag"
                        size={22}
                        color={Colors.blackColor}
                        onPress={() => router.push('/(tabs)/cart/cartScreen')}
                    />
                </View>
            </View>
        )
    }

    async function handleAddToCart() {
        if (!auth?.currentUser) {
            navigation.push('auth/loginScreen');
            return;
        }
        try {
            const updateCart = httpsCallable(functions, 'updateCart');
            await updateCart({
                action: 'add',
                productId,
                size: selectedSize || null,
                selectedPurity: selectedPurity || null,
                selectedColor: selectedGoldOption || null,
                selectedDiamondQuality: selectedDiamondQuality || null,
                quantity: 1,
            });
            DeviceEventEmitter.emit('cartUpdated');
            setsnackText('Added to cart');
            setshowSnackBar(true);
            setAddedToCart(true);
        } catch (err) {
            setsnackText('Failed to add to cart');
            setshowSnackBar(true);
        }
    }

    async function toggleFavorite() {
        if (!auth?.currentUser) {
            navigation.push('auth/loginScreen');
            return;
        }
        try {
            const updateFavorites = httpsCallable(functions, 'updateFavorites');
            const action = isFavorite ? 'remove' : 'add';
            await updateFavorites({ action, productId });
            setisFavorite(!isFavorite);
            DeviceEventEmitter.emit('favoritesUpdated');
            setsnackText(isFavorite ? 'Removed from favourite' : 'Added to favourite');
            setshowSnackBar(true);
        } catch (err) {
            setsnackText('Failed to update favourite');
            setshowSnackBar(true);
        }
    }
}

export default ProductDetailScreen

const styles = StyleSheet.create({
    headerWrapStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Sizes.fixPadding * 2.0,
        paddingVertical: Sizes.fixPadding,
        borderBottomColor: Colors.offWhiteColor,
        borderBottomWidth: 1.0,
    },
    dotsWrap: {
        position: 'absolute',
        bottom: Sizes.fixPadding,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    dotStyle: {
        marginHorizontal: 4,
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dotActive: {
        backgroundColor: Colors.primaryColor,
    },
    dotInactive: {
        backgroundColor: Colors.lightGrayColor,
    },
    productImageStyle: {
        width: Screen.width / 1.5,
        height: Screen.height / 3.5,
        resizeMode: 'contain',
        alignSelf: 'center',
    },
    productSizeBoxStyle: {
        borderColor: Colors.offWhiteColor,
        borderWidth: 1.0,
        paddingHorizontal: Sizes.fixPadding,
        paddingVertical: Sizes.fixPadding - 5.0,
        marginHorizontal: Sizes.fixPadding - 3.0,
        borderRadius: Sizes.fixPadding - 5.0,
        minWidth: 45,
        alignItems: 'center',
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
    bottomButtonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.whiteColor,
        paddingHorizontal: Sizes.fixPadding * 2.0,
        paddingVertical: Sizes.fixPadding,
        borderTopColor: Colors.offWhiteColor,
        borderTopWidth: 1.0,
    },
    addToCartButton: {
        backgroundColor: Colors.blackColor,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Sizes.fixPadding,
        padding: Sizes.fixPadding + 2.0,
    },
    // Collapsible Section Styles
    collapsibleSection: {
        borderColor: Colors.offWhiteColor,
        borderWidth: 1.0,
        borderRadius: Sizes.fixPadding,
        marginBottom: Sizes.fixPadding,
        overflow: 'hidden',
    },
    collapsibleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Sizes.fixPadding + 2,
        backgroundColor: Colors.offWhiteColor,
    },
    collapsibleTitle: {
        ...Fonts.primaryColor14Bold,
        letterSpacing: 0.5,
    },
    collapsibleContent: {
        padding: Sizes.fixPadding + 2,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Sizes.fixPadding - 4,
        borderBottomColor: Colors.offWhiteColor,
        borderBottomWidth: 0.5,
    },
    detailLabel: {
        ...Fonts.grayColor14Regular,
        flex: 1,
    },
    detailValue: {
        ...Fonts.blackColor15Medium,
        textAlign: 'right',
    },
    highlightLabel: {
        color: Colors.primaryColor,
    },
    highlightValue: {
        ...Fonts.primaryColor16Bold,
    },
    // Diamond Table Styles
    diamondVariantsTable: {
        marginTop: Sizes.fixPadding,
        borderColor: Colors.offWhiteColor,
        borderWidth: 1,
        borderRadius: Sizes.fixPadding - 5,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: Colors.offWhiteColor,
        paddingVertical: Sizes.fixPadding - 4,
        paddingHorizontal: Sizes.fixPadding - 5,
    },
    tableHeaderText: {
        ...Fonts.grayColor14Medium,
        fontSize: 12,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: Sizes.fixPadding - 4,
        paddingHorizontal: Sizes.fixPadding - 5,
        borderBottomColor: Colors.offWhiteColor,
        borderBottomWidth: 0.5,
    },
    tableCell: {
        ...Fonts.blackColor15Regular,
        fontSize: 13,
    },
    metalDivider: {
        height: 1,
        backgroundColor: Colors.offWhiteColor,
        marginVertical: Sizes.fixPadding - 5,
    },
    // Price Breakup Styles
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Sizes.fixPadding - 4,
    },
    priceLabel: {
        ...Fonts.blackColor15Regular,
    },
    priceValue: {
        ...Fonts.primaryColor16Bold,
    },
    discountValue: {
        color: Colors.greenColor,
    },
    totalPriceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Sizes.fixPadding,
        marginTop: Sizes.fixPadding - 5,
        borderTopColor: Colors.offWhiteColor,
        borderTopWidth: 1,
    },
    totalLabel: {
        ...Fonts.blackColor16SemiBold,
    },
    totalValue: {
        ...Fonts.primaryColor18Bold,
    },
    // Gold Options Styles
    pillChip: {
        borderColor: Colors.offWhiteColor,
        borderWidth: 1.0,
        borderRadius: Sizes.fixPadding - 5.0,
        paddingHorizontal: Sizes.fixPadding,
        paddingVertical: Sizes.fixPadding - 5.0,
        marginRight: Sizes.fixPadding,
        marginBottom: Sizes.fixPadding - 5,
    },
    pillChipSelected: {
        borderColor: Colors.primaryColor,
        backgroundColor: Colors.primaryColor + '10',
    },
    pillChipText: {
        ...Fonts.grayColor14Regular,
    },
    pillChipTextSelected: {
        ...Fonts.primaryColor14Medium,
    },
    goldOptionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderColor: Colors.offWhiteColor,
        borderWidth: 1.0,
        borderRadius: Sizes.fixPadding - 5.0,
        paddingHorizontal: Sizes.fixPadding,
        paddingVertical: Sizes.fixPadding - 5.0,
        marginRight: Sizes.fixPadding,
        marginBottom: Sizes.fixPadding - 5,
    },
    goldOptionChipSelected: {
        borderColor: Colors.primaryColor,
        backgroundColor: Colors.primaryColor + '10',
    },
    goldColorIndicator: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: Sizes.fixPadding - 5,
        borderWidth: 1,
        borderColor: Colors.lightGrayColor,
    },
    goldOptionText: {
        ...Fonts.grayColor14Regular,
    },
    goldOptionTextSelected: {
        ...Fonts.primaryColor14Medium,
    },
})
