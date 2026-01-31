import { Dimensions } from 'react-native'

export const Colors = {
    primaryColor: '#0B1F5A',
    whiteColor: '#FFFDF4',
    offWhiteColor: '#F4EEDC',
    blackColor: '#1C1F32',
    grayColor: '#8C8577',
    lightGrayColor: '#C9C1B1',
    greenColor: '#009688',
    blueColor: '#00A7F7',
    redColor: '#DD5A5A',
    lightNavyBlueColor: '#1C2F73',
}

export const Sizes = {
    fixPadding: 10.0
}

const screenWidth = Dimensions.get('window').width;

const screenHeight = Dimensions.get('window').height;

export const Screen = {
    width: screenWidth,
    height: screenHeight,
}

export const Fonts = {

    primaryColor14Medium: {
        color: Colors.primaryColor,
        fontSize: 14.0,
        fontFamily: 'Mukta-Medium',
    },

    primaryColor19Medium: {
        color: Colors.primaryColor,
        fontSize: 19.0,
        fontFamily: 'Mukta-Medium',
    },

    primaryColor14Bold: {
        color: Colors.primaryColor,
        fontSize: 14.0,
        fontFamily: 'Mukta-Bold',
    },

    primaryColor16Bold: {
        color: Colors.primaryColor,
        fontSize: 16.0,
        fontFamily: 'Mukta-Bold',
    },

    primaryColor18Bold: {
        color: Colors.primaryColor,
        fontSize: 18.0,
        fontFamily: 'Mukta-Bold',
    },

    grayColor14Regular: {
        color: Colors.grayColor,
        fontSize: 14.0,
        fontFamily: 'Mukta-Regular',
    },

    grayColor15Regular: {
        color: Colors.grayColor,
        fontSize: 15.0,
        fontFamily: 'Mukta-Regular',
    },

    grayColor16Regular: {
        color: Colors.grayColor,
        fontSize: 16.0,
        fontFamily: 'Mukta-Regular',
    },

    grayColor17Regular: {
        color: Colors.grayColor,
        fontSize: 17.0,
        fontFamily: 'Mukta-Regular',
    },

    grayColor13Medium: {
        color: Colors.grayColor,
        fontSize: 13.0,
        fontFamily: 'Mukta-Medium',
    },

    grayColor14Medium: {
        color: Colors.grayColor,
        fontSize: 14.0,
        fontFamily: 'Mukta-Medium',
    },

    lightGrayColor16Regular: {
        color: Colors.lightGrayColor,
        fontSize: 16.0,
        fontFamily: 'Mukta-Regular',
    },

    lightGrayColor18SemiBold: {
        color: Colors.lightGrayColor,
        fontSize: 18.0,
        fontFamily: 'Mukta-SemiBold',
    },

    blackColor15Regular: {
        color: Colors.blackColor,
        fontSize: 15.0,
        fontFamily: 'Mukta-Regular',
    },

    blackColor16Regular: {
        color: Colors.blackColor,
        fontSize: 16.0,
        fontFamily: 'Mukta-Regular',
    },

    blackColor17Regular: {
        color: Colors.blackColor,
        fontSize: 17.0,
        fontFamily: 'Mukta-Regular',
    },

    blackColor18Regular: {
        color: Colors.blackColor,
        fontSize: 18.0,
        fontFamily: 'Mukta-Regular',
    },

    blackColor15Medium: {
        color: Colors.blackColor,
        fontSize: 15.0,
        fontFamily: 'Mukta-Medium'
    },

    blackColor16Medium: {
        color: Colors.blackColor,
        fontSize: 16.0,
        fontFamily: 'Mukta-Medium'
    },

    blackColor18Medium: {
        color: Colors.blackColor,
        fontSize: 18.0,
        fontFamily: 'Mukta-Medium'
    },

    blackColor16SemiBold: {
        color: Colors.blackColor,
        fontSize: 16.0,
        fontFamily: 'Mukta-SemiBold'
    },

    blackColor18SemiBold: {
        color: Colors.blackColor,
        fontSize: 18.0,
        fontFamily: 'Mukta-SemiBold'
    },

    blackColor20SemiBold: {
        color: Colors.blackColor,
        fontSize: 20.0,
        fontFamily: 'Mukta-SemiBold'
    },

    blackColor14Bold: {
        color: Colors.blackColor,
        fontSize: 14.0,
        fontFamily: 'Mukta-Bold'
    },

    blackColor26AryaRegular: {
        color: Colors.blackColor,
        fontSize: 26.0,
        fontFamily: 'Arya-Regular'
    },

    whiteColor15Regular: {
        color: Colors.whiteColor,
        fontSize: 15.0,
        fontFamily: 'Mukta-Regular'
    },

    whiteColor17Regular: {
        color: Colors.whiteColor,
        fontSize: 17.0,
        fontFamily: 'Mukta-Regular'
    },

    whiteColor16Medium: {
        color: Colors.whiteColor,
        fontSize: 16.0,
        fontFamily: 'Mukta-Medium'
    },

    whiteColor19Medium: {
        color: Colors.whiteColor,
        fontSize: 19.0,
        fontFamily: 'Mukta-Medium'
    },

    whiteColor22Bold: {
        color: Colors.whiteColor,
        fontSize: 22.0,
        fontFamily: 'Mukta-Bold'
    },

    whiteColor24ExtraBold: {
        color: Colors.whiteColor,
        fontSize: 24.0,
        fontFamily: 'Mukta-ExtraBold'
    }

}

export const CommomStyles = {
    headerStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Sizes.fixPadding * 2.0,
        borderBottomColor: Colors.offWhiteColor,
        borderBottomWidth: 1.0,
    },
    buttonStyle: {
        backgroundColor: Colors.blackColor,
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginBottom: Sizes.fixPadding * 2.0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Sizes.fixPadding,
        padding: Sizes.fixPadding + 4.0,
    },
    snackBarStyle: {
        position: 'absolute',
        bottom: -10.0,
        left: -10.0,
        right: -10.0,
        backgroundColor: Colors.blackColor,
    }
}

