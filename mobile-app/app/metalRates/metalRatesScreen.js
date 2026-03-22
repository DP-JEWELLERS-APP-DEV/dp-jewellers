import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image } from 'react-native'
import React, { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors, Fonts, Sizes, CommomStyles } from '../../constants/styles'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import MyStatusBar from '../../components/myStatusBar'
import { useNavigation, useRouter } from 'expo-router'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../lib/firebase'
import { MetalRatesShimmer } from '../../components/ShimmerPlaceholder'

const RATES_CACHE_KEY = 'dp_metal_rates_v1'
const RATES_CACHE_TTL_MS = 10 * 60 * 1000

const MetalRatesScreen = () => {
    const navigation = useNavigation()
    const router = useRouter()
    const [rates, setRates] = useState(null)
    const [loading, setLoading] = useState(true)
    const [errorText, setErrorText] = useState('')

    useEffect(() => {
        let active = true
        const run = async () => {
            let fromCache = false
            try {
                const raw = await AsyncStorage.getItem(RATES_CACHE_KEY)
                if (raw) {
                    const { t, data } = JSON.parse(raw)
                    if (Date.now() - t < RATES_CACHE_TTL_MS && data && active) {
                        setRates(data)
                        setLoading(false)
                        fromCache = true
                    }
                }
            } catch (_) { /* ignore */ }

            if (!fromCache && active) setLoading(true)
            setErrorText('')
            try {
                const getMetalRates = httpsCallable(functions, 'getMetalRates')
                const res = await getMetalRates()
                const data = res?.data || null
                if (active) {
                    setRates(data)
                    if (data) {
                        try {
                            await AsyncStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ t: Date.now(), data }))
                        } catch (_) { /* ignore */ }
                    }
                }
            } catch (err) {
                if (active && !fromCache) setErrorText('Failed to load metal rates.')
            } finally {
                if (active) setLoading(false)
            }
        }
        run()
        return () => {
            active = false
        }
    }, [])

    const formatCurrency = (value) => {
        const num = Number(value)
        if (!Number.isFinite(num)) return '-'
        return `₹${num.toLocaleString('en-IN')}`
    }

    return (
        <View style={{ flex: 1, backgroundColor: Colors.whiteColor }}>
            <MyStatusBar />
            <View style={{ flex: 1 }}>
                {header()}
                {loading && !rates ? (
                    <MetalRatesShimmer />
                ) : errorText ? (
                    <View style={styles.centerWrap}>
                        <Text style={styles.errorText}>{errorText}</Text>
                    </View>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Sizes.fixPadding * 2.0 }}>
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardTitleWrap}>
                                    <MaterialCommunityIcons name="currency-inr" size={20} color={Colors.blackColor} />
                                    <Text style={{ ...Fonts.blackColor16SemiBold, marginLeft: 8 }}>Current Metal & Diamond Rates</Text>
                                </View>
                             
                            </View>

                            <Section title="Gold (per gram)">
                                <RateRow label="24K Gold" value={formatCurrency(rates?.gold?.['24K'])} />
                                <RateRow label="22K Gold" value={formatCurrency(rates?.gold?.['22K'])} />
                                <RateRow label="18K Gold" value={formatCurrency(rates?.gold?.['18K'])} />
                                <RateRow label="14K Gold" value={formatCurrency(rates?.gold?.['14K'])} isLast />
                            </Section>

                            <Section title="Silver & Platinum (per gram)">
                                <RateRow label="925 Sterling Silver" value={formatCurrency(rates?.silver?.['925_sterling'])} />
                                <RateRow label="999 Pure Silver" value={formatCurrency(rates?.silver?.['999_pure'])} />
                                <RateRow
                                    label="950 Platinum"
                                    value={formatCurrency(rates?.platinum?.['950'] || rates?.platinum?.perGram)}
                                    isLast
                                />
                            </Section>

                            <Section title="Diamond (per carat)" icon="diamond-stone">
                                <RateRow label="SI I-J" value={formatCurrency(rates?.diamond?.SI_IJ)} />
                                <RateRow label="SI G-H" value={formatCurrency(rates?.diamond?.SI_GH)} />
                                <RateRow label="VS G-H" value={formatCurrency(rates?.diamond?.VS_GH)} />
                                <RateRow label="VVS E-F" value={formatCurrency(rates?.diamond?.VVS_EF)} />
                                <RateRow label="IF D-F" value={formatCurrency(rates?.diamond?.IF_DEF)} isLast />
                            </Section>
                        </View>
                    </ScrollView>
                )}
            </View>
        </View>
    )

    function header() {
        return (
            <View style={CommomStyles.headerStyle}>
                <MaterialIcons name="keyboard-backspace" size={26} color={Colors.blackColor} onPress={() => { navigation.pop() }} />
                <TouchableOpacity onPress={() => router.replace('/(tabs)/home/homeScreen')} activeOpacity={0.7} style={{ flex: 1, alignItems: 'center' }}>
                    <Image source={require('../../assets/images/dp-logo-02.png')} style={CommomStyles.headerLogo} />
                </TouchableOpacity>
                <View style={{ width: 26 }} />
            </View>
        )
    }
}

const Section = ({ title, icon, children }) => {
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                {icon ? <MaterialCommunityIcons name={icon} size={18} color={Colors.blackColor} /> : null}
                <Text style={{ ...Fonts.blackColor14SemiBold, marginLeft: icon ? 6 : 0 }}>{title}</Text>
            </View>
            <View style={styles.sectionBody}>
                {children}
            </View>
        </View>
    )
}

const RateRow = ({ label, value, isLast }) => {
    return (
        <View style={[styles.rateRow, isLast && { borderBottomWidth: 0 }]}>
            <Text style={{ ...Fonts.grayColor14Regular }}>{label}</Text>
            <Text style={{ ...Fonts.blackColor14SemiBold }}>{value}</Text>
        </View>
    )
}

export default MetalRatesScreen

const styles = StyleSheet.create({
    card: {
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginTop: Sizes.fixPadding * 2.0,
        backgroundColor: Colors.whiteColor,
        borderRadius: Sizes.fixPadding,
        borderColor: Colors.offWhiteColor,
        borderWidth: 1.0,
        paddingBottom: Sizes.fixPadding,
    },
    cardHeader: {
        padding: Sizes.fixPadding * 2.0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomColor: Colors.offWhiteColor,
        borderBottomWidth: 1.0,
    },
    cardTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        paddingRight: Sizes.fixPadding,
    },
    readOnlyChip: {
        borderColor: Colors.grayColor,
        borderWidth: 1.0,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    readOnlyText: {
        ...Fonts.grayColor12Medium,
    },
    section: {
        paddingHorizontal: Sizes.fixPadding * 2.0,
        paddingTop: Sizes.fixPadding * 2.0,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Sizes.fixPadding,
    },
    sectionBody: {
        backgroundColor: Colors.offWhiteColor,
        borderRadius: Sizes.fixPadding - 4.0,
        paddingHorizontal: Sizes.fixPadding,
    },
    rateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Sizes.fixPadding,
        borderBottomColor: Colors.whiteColor,
        borderBottomWidth: 1.0,
    },
    centerWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        color: Colors.redColor,
        fontSize: 16.0,
        fontFamily: 'Mukta-Medium',
    },
})
