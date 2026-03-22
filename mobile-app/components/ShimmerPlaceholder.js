import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import ShimmerPlaceholderLib from 'react-native-shimmer-placeholder';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Sizes, Screen } from '../constants/styles';

// Base shimmer component with consistent DP Jewellers styling
const Shimmer = ({ style }) => (
    <ShimmerPlaceholderLib
        LinearGradient={LinearGradient}
        shimmerColors={['#F0EAD6', '#E0D8C0', '#F0EAD6']}
        style={[styles.defaultShimmer, style]}
    />
);

// ─── Screen-level shimmer skeletons ───────────────────────────────────────────

const CATEGORY_SIZE = Screen.width / 4.5;

export const HomeScreenShimmer = () => (
    <ScrollView
        style={{ flex: 1, backgroundColor: Colors.whiteColor }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        contentContainerStyle={{ paddingBottom: 100 }}
    >
        {/* 1. Search bar */}
        <Shimmer style={styles.homeSearchBar} />

        {/* 2. Banner — full-width card */}
        <Shimmer style={styles.homeBanner} />

        {/* 3. Category row — horizontal scroll of square tiles with label */}
        <View style={styles.homeCategoryRow}>
            {[1, 2, 3, 4].map(i => (
                <View key={i} style={styles.homeCategoryItem}>
                    <Shimmer style={styles.homeCategorySquare} />
                    <Shimmer style={styles.homeCategoryLabel} />
                </View>
            ))}
        </View>

        {/* 4. DP Signature section — centered title + subtitle + explore button */}
        <View style={styles.homeSignatureBlock}>
            <Shimmer style={styles.homeSignatureTitle} />
            <Shimmer style={styles.homeSignatureSub} />
            <Shimmer style={styles.homeSignatureBtn} />
        </View>

        {/* 5. Horizontal product scroll (DP Signature) */}
        <View style={styles.homeHorizontalScroll}>
            {[1, 2, 3].map(i => (
                <Shimmer key={i} style={styles.homeHorizontalCard} />
            ))}
        </View>

        {/* 6. Section header + 2-column grid */}
        <View style={styles.homeSectionHeaderRow}>
            <Shimmer style={styles.homeSectionHeaderText} />
            <Shimmer style={styles.homeSectionHeaderLink} />
        </View>
        <View style={styles.homeGridRow}>
            <Shimmer style={styles.homeProductCard} />
            <Shimmer style={styles.homeProductCard} />
        </View>

        {/* 7. Second section header + 2-column grid */}
        <View style={[styles.homeSectionHeaderRow, { marginTop: Sizes.fixPadding }]}>
            <Shimmer style={styles.homeSectionHeaderText} />
            <Shimmer style={styles.homeSectionHeaderLink} />
        </View>
        <View style={styles.homeGridRow}>
            <Shimmer style={styles.homeProductCard} />
            <Shimmer style={styles.homeProductCard} />
        </View>
    </ScrollView>
);

export const ProductDetailShimmer = () => (
    <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
        {/* Hero image */}
        <Shimmer style={styles.productHeroImage} />
        <View style={{ padding: Sizes.fixPadding * 2.0 }}>
            {/* Title */}
            <Shimmer style={styles.textLineLong} />
            <Shimmer style={{ ...styles.textLineShort, marginTop: 8 }} />
            {/* Price */}
            <Shimmer style={{ ...styles.textLineMedium, marginTop: 16 }} />
            {/* Variant chips */}
            <View style={{ ...styles.row, marginTop: 16 }}>
                {[1, 2, 3].map(i => <Shimmer key={i} style={styles.chip} />)}
            </View>
        </View>
    </View>
);

export const OrdersScreenShimmer = () => (
    <View style={{ flex: 1, backgroundColor: Colors.whiteColor, padding: Sizes.fixPadding * 2.0 }}>
        {[1, 2, 3, 4].map(i => (
            <View key={i} style={styles.orderCard}>
                <View style={styles.rowBetween}>
                    <Shimmer style={styles.textLineMedium} />
                    <Shimmer style={styles.badge} />
                </View>
                <Shimmer style={{ ...styles.textLineShort, marginTop: 8 }} />
                <View style={styles.divider} />
                <Shimmer style={styles.textLineLong} />
                <Shimmer style={{ ...styles.textLineShort, marginTop: 6 }} />
            </View>
        ))}
    </View>
);

export const OrderDetailShimmer = () => (
    <View style={{ flex: 1, backgroundColor: Colors.whiteColor, padding: Sizes.fixPadding * 2.0 }}>
        {/* Status row */}
        <Shimmer style={{ height: 60, borderRadius: 8, marginBottom: Sizes.fixPadding * 2.0 }} />
        {/* Section header */}
        <Shimmer style={styles.sectionHeader} />
        {/* Items */}
        {[1, 2].map(i => (
            <View key={i} style={styles.orderItemRow}>
                <Shimmer style={styles.itemImage} />
                <View style={{ flex: 1, marginLeft: Sizes.fixPadding }}>
                    <Shimmer style={styles.textLineLong} />
                    <Shimmer style={{ ...styles.textLineShort, marginTop: 6 }} />
                </View>
            </View>
        ))}
        {/* Price breakdown */}
        <Shimmer style={{ ...styles.sectionHeader, marginTop: Sizes.fixPadding * 2.0 }} />
        {[1, 2, 3].map(i => (
            <View key={i} style={styles.rowBetween}>
                <Shimmer style={styles.textLineShort} />
                <Shimmer style={styles.badge} />
            </View>
        ))}
    </View>
);

export const CartScreenShimmer = () => (
    <View style={{ flex: 1, backgroundColor: Colors.whiteColor, paddingTop: Sizes.fixPadding * 2.0 }}>
        {[1, 2, 3].map(i => (
            <View key={i} style={styles.cartItemRow}>
                <Shimmer style={styles.itemImage} />
                <View style={{ flex: 1, marginLeft: Sizes.fixPadding }}>
                    <Shimmer style={styles.textLineLong} />
                    <Shimmer style={{ ...styles.textLineShort, marginTop: 6 }} />
                    <Shimmer style={{ ...styles.textLineShort, marginTop: 6 }} />
                </View>
            </View>
        ))}
    </View>
);

export const ProfileScreenShimmer = () => (
    <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
        <View style={styles.profileSection}>
            <Shimmer style={styles.avatarCircle} />
            <Shimmer style={{ ...styles.textLineMedium, marginTop: Sizes.fixPadding }} />
            <Shimmer style={{ ...styles.textLineShort, marginTop: 6 }} />
        </View>
        {[1, 2, 3, 4, 5].map(i => (
            <Shimmer key={i} style={styles.profileRow} />
        ))}
    </View>
);

export const SearchScreenShimmer = () => (
    <View style={{ flex: 1, backgroundColor: Colors.whiteColor, padding: Sizes.fixPadding }}>
        <Shimmer style={{ ...styles.textLineLong, marginBottom: Sizes.fixPadding * 2.0 }} />
        <View style={styles.gridRow}>
            {[1, 2].map(i => <Shimmer key={i} style={styles.productCard} />)}
        </View>
        <View style={styles.gridRow}>
            {[1, 2].map(i => <Shimmer key={i} style={styles.productCard} />)}
        </View>
    </View>
);

/** Wishlist / category listing: 2-column product grid */
export const FavoriteScreenShimmer = () => (
    <View style={{ flex: 1, backgroundColor: Colors.whiteColor, paddingHorizontal: Sizes.fixPadding, paddingTop: Sizes.fixPadding * 2.0 }}>
        <View style={styles.gridRow}>
            {[1, 2].map(i => <Shimmer key={i} style={styles.productCard} />)}
        </View>
        <View style={styles.gridRow}>
            {[1, 2].map(i => <Shimmer key={i} style={styles.productCard} />)}
        </View>
        <View style={styles.gridRow}>
            {[1, 2].map(i => <Shimmer key={i} style={styles.productCard} />)}
        </View>
    </View>
);

export const CategoryProductsShimmer = FavoriteScreenShimmer;

export const MetalRatesShimmer = () => (
    <View style={{ flex: 1, backgroundColor: Colors.whiteColor, paddingHorizontal: Sizes.fixPadding * 2.0, paddingTop: Sizes.fixPadding * 2.0 }}>
        <Shimmer style={{ height: 22, width: '70%', borderRadius: 6, marginBottom: Sizes.fixPadding * 2.0 }} />
        <Shimmer style={{ height: 280, borderRadius: Sizes.fixPadding, marginBottom: Sizes.fixPadding }} />
    </View>
);

export const DeliveryMethodShimmer = () => (
    <View style={{ flex: 1, backgroundColor: Colors.whiteColor, padding: Sizes.fixPadding * 2.0 }}>
        <Shimmer style={{ ...styles.textLineLong, marginBottom: Sizes.fixPadding * 2.0 }} />
        {[1, 2].map(i => (
            <Shimmer key={i} style={styles.optionCard} />
        ))}
    </View>
);

export const OrderSummaryShimmer = () => (
    <View style={{ flex: 1, backgroundColor: Colors.whiteColor, padding: Sizes.fixPadding * 2.0 }}>
        <Shimmer style={styles.deliveryCard} />
        <Shimmer style={{ ...styles.sectionHeader, marginTop: Sizes.fixPadding * 2.0 }} />
        {[1, 2].map(i => (
            <View key={i} style={styles.orderItemRow}>
                <Shimmer style={styles.itemImage} />
                <View style={{ flex: 1, marginLeft: Sizes.fixPadding }}>
                    <Shimmer style={styles.textLineLong} />
                    <Shimmer style={{ ...styles.textLineShort, marginTop: 6 }} />
                </View>
            </View>
        ))}
        <Shimmer style={styles.priceCard} />
    </View>
);

export default Shimmer;

const styles = StyleSheet.create({
    defaultShimmer: {
        borderRadius: Sizes.fixPadding - 2,
    },
    row: {
        flexDirection: 'row',
        paddingHorizontal: Sizes.fixPadding,
        marginTop: Sizes.fixPadding,
    },
    rowBetween: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Sizes.fixPadding,
    },
    // Home shimmer
    homeSearchBar: {
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginTop: Sizes.fixPadding,
        marginBottom: Sizes.fixPadding * 1.5,
        height: 46,
        borderRadius: 30,
    },
    homeBanner: {
        marginHorizontal: Sizes.fixPadding * 2.0,
        height: 290,
        borderRadius: Sizes.fixPadding,
        marginBottom: Sizes.fixPadding,
    },
    homeCategoryRow: {
        flexDirection: 'row',
        paddingHorizontal: Sizes.fixPadding,
        paddingTop: Sizes.fixPadding + 3,
        marginVertical: Sizes.fixPadding,
    },
    homeCategoryItem: {
        alignItems: 'center',
        marginHorizontal: Sizes.fixPadding,
    },
    homeCategorySquare: {
        width: CATEGORY_SIZE,
        height: CATEGORY_SIZE,
        borderRadius: Sizes.fixPadding,
    },
    homeCategoryLabel: {
        width: CATEGORY_SIZE - 10,
        height: 12,
        borderRadius: 5,
        marginTop: Sizes.fixPadding,
    },
    homeSignatureBlock: {
        alignItems: 'center',
        paddingHorizontal: Sizes.fixPadding,
        marginTop: Sizes.fixPadding,
        marginBottom: Sizes.fixPadding,
    },
    homeSignatureTitle: {
        height: 20,
        width: 160,
        borderRadius: 5,
        marginBottom: 8,
    },
    homeSignatureSub: {
        height: 13,
        width: 210,
        borderRadius: 5,
        marginBottom: 12,
    },
    homeSignatureBtn: {
        height: 32,
        width: 180,
        borderRadius: 20,
    },
    homeHorizontalScroll: {
        flexDirection: 'row',
        paddingHorizontal: Sizes.fixPadding,
        marginTop: Sizes.fixPadding,
        marginBottom: Sizes.fixPadding * 2.0,
    },
    homeHorizontalCard: {
        width: Screen.width * 0.42,
        height: 200,
        borderRadius: Sizes.fixPadding,
        marginRight: Sizes.fixPadding,
    },
    homeSectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginBottom: Sizes.fixPadding,
    },
    homeSectionHeaderText: {
        height: 18,
        width: 120,
        borderRadius: 5,
    },
    homeSectionHeaderLink: {
        height: 14,
        width: 55,
        borderRadius: 5,
    },
    homeGridRow: {
        flexDirection: 'row',
        paddingHorizontal: Sizes.fixPadding * 1.5,
        marginBottom: Sizes.fixPadding,
    },
    homeProductCard: {
        flex: 1,
        height: 230,
        borderRadius: Sizes.fixPadding,
        marginHorizontal: Sizes.fixPadding / 2,
    },
    // shared
    sectionHeader: {
        height: 20,
        width: 160,
        borderRadius: 6,
        marginHorizontal: Sizes.fixPadding,
        marginTop: Sizes.fixPadding * 2.0,
        marginBottom: Sizes.fixPadding,
    },
    gridRow: {
        flexDirection: 'row',
        paddingHorizontal: Sizes.fixPadding,
        marginBottom: Sizes.fixPadding,
    },
    productCard: {
        flex: 1,
        height: 220,
        borderRadius: Sizes.fixPadding,
        marginHorizontal: Sizes.fixPadding / 2,
    },
    // Product detail
    productHeroImage: {
        width: Screen.width,
        height: Screen.width * 0.8,
        borderRadius: 0,
    },
    textLineLong: {
        height: 16,
        width: '85%',
        borderRadius: 6,
    },
    textLineMedium: {
        height: 16,
        width: '55%',
        borderRadius: 6,
    },
    textLineShort: {
        height: 14,
        width: '35%',
        borderRadius: 6,
    },
    chip: {
        height: 32,
        width: 72,
        borderRadius: 20,
        marginRight: Sizes.fixPadding,
    },
    // Orders
    orderCard: {
        borderWidth: 1,
        borderColor: Colors.offWhiteColor,
        borderRadius: Sizes.fixPadding,
        padding: Sizes.fixPadding + 2,
        marginBottom: Sizes.fixPadding * 2.0,
    },
    badge: {
        height: 24,
        width: 80,
        borderRadius: 4,
    },
    divider: {
        borderColor: Colors.offWhiteColor,
        borderWidth: 1,
        marginVertical: Sizes.fixPadding,
    },
    // Cart & order detail
    cartItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.offWhiteColor,
        borderRadius: Sizes.fixPadding,
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginBottom: Sizes.fixPadding * 2.0,
        padding: Sizes.fixPadding,
    },
    orderItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.offWhiteColor,
        borderRadius: Sizes.fixPadding,
        marginBottom: Sizes.fixPadding * 2.0,
        padding: Sizes.fixPadding,
    },
    itemImage: {
        width: 72,
        height: 72,
        borderRadius: Sizes.fixPadding - 2,
    },
    // Profile
    profileSection: {
        alignItems: 'center',
        paddingVertical: Sizes.fixPadding * 2.0,
        borderBottomColor: Colors.offWhiteColor,
        borderBottomWidth: 1,
        marginBottom: Sizes.fixPadding,
    },
    avatarCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    profileRow: {
        height: 54,
        borderWidth: 1,
        borderColor: Colors.offWhiteColor,
        borderRadius: Sizes.fixPadding,
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginBottom: Sizes.fixPadding + 6,
    },
    // Delivery & order summary
    optionCard: {
        height: 90,
        borderRadius: Sizes.fixPadding,
        marginBottom: Sizes.fixPadding * 2.0,
    },
    deliveryCard: {
        height: 100,
        borderRadius: Sizes.fixPadding,
        marginBottom: Sizes.fixPadding * 2.0,
    },
    priceCard: {
        height: 120,
        borderRadius: Sizes.fixPadding,
        marginTop: Sizes.fixPadding * 2.0,
    },
});
