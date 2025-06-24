/**
 * Font Configuration
 * Cấu hình font cho Vnipet App
 */

export const Fonts = {
  SFProDisplay: {
    regular: 'SF-Pro-Display-Regular',
    medium: 'SF-Pro-Display-Medium',
    semibold: 'SF-Pro-Display-Semibold',
    bold: 'SF-Pro-Display-Bold',
  },
  SFProText: {
    regular: 'SF-Pro-Text-Regular',
    medium: 'SF-Pro-Text-Medium',
    semibold: 'SF-Pro-Text-Semibold',
    bold: 'SF-Pro-Text-Bold',
  },
};

// Font weights mapping
export const FontWeights = {
  '400': Fonts.SFProText.regular,
  '500': Fonts.SFProText.medium,
  '600': Fonts.SFProText.semibold,
  '700': Fonts.SFProText.bold,
};

// Get font family based on weight
export const getFontFamily = (weight: '400' | '500' | '600' | '700', isDisplay = false) => {
  if (isDisplay) {
    switch (weight) {
      case '400': return Fonts.SFProDisplay.regular;
      case '500': return Fonts.SFProDisplay.medium;
      case '600': return Fonts.SFProDisplay.semibold;
      case '700': return Fonts.SFProDisplay.bold;
      default: return Fonts.SFProDisplay.regular;
    }
  } else {
    return FontWeights[weight] || Fonts.SFProText.regular;
  }
};

export default Fonts; 