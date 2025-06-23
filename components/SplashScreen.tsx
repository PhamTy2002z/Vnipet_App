import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

type SplashScreenProps = {
  onFinish: () => void;
};

export function SplashScreen({ onFinish }: SplashScreenProps) {
  // Animation values
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const sloganOpacity = useSharedValue(0);
  const sloganTranslateY = useSharedValue(15);
  const dotScale = useSharedValue(0);

  useEffect(() => {
    // Logo animation
    logoOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) });
    logoScale.value = withTiming(1, { duration: 1000, easing: Easing.elastic(1.2) });

    // Text animation (after logo)
    textOpacity.value = withDelay(
      600,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) })
    );
    textTranslateY.value = withDelay(
      600,
      withTiming(0, { duration: 800, easing: Easing.out(Easing.ease) })
    );

    // Slogan animation (after text)
    sloganOpacity.value = withDelay(
      1200,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) })
    );
    sloganTranslateY.value = withDelay(
      1200,
      withTiming(0, { duration: 800, easing: Easing.out(Easing.ease) })
    );

    // Loading dots animation
    dotScale.value = withDelay(
      1500,
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0.8, { duration: 400 }),
        withTiming(1, { duration: 400 }),
        withTiming(0.8, { duration: 400 }),
        withTiming(1, { duration: 400 })
      )
    );

    // Trigger onFinish callback after animations complete
    const timeout = setTimeout(() => {
      onFinish();
    }, 3500);

    return () => clearTimeout(timeout);
  }, []);

  // Animated styles
  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const sloganAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sloganOpacity.value,
    transform: [{ translateY: sloganTranslateY.value }],
  }));

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }));

  return (
    <LinearGradient
      colors={['#1CE6DA', '#2567E8']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}>
      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <Image source={require('@/assets/images/splash-screen/Logo.png')} style={styles.logo} />
        </Animated.View>

        <Animated.Text style={[styles.title, textAnimatedStyle]}>VNIPET</Animated.Text>

        <Animated.Text style={[styles.slogan, sloganAnimatedStyle]}>
          Your Pet Care Partner
        </Animated.Text>

        <View style={styles.loadingContainer}>
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.loadingDot,
                dotAnimatedStyle,
                { opacity: i === 1 ? 0.8 : i === 2 ? 0.6 : 1 },
              ]}
            />
          ))}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    width: width * 0.35,
    height: width * 0.35,
    backgroundColor: 'white',
    borderRadius: width * 0.35 / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  logo: {
    width: '85%',
    height: '85%',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 3,
    marginBottom: 5,
  },
  slogan: {
    fontSize: 18,
    color: 'white',
    opacity: 0.9,
    letterSpacing: 0.5,
    marginTop: 5,
  },
  loadingContainer: {
    flexDirection: 'row',
    marginTop: 50,
    height: 10,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
    margin: 5,
  },
}); 