import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function AnimatedSplashScreen({ onFinish }) {
  const themeContext = useTheme();
  const isDarkMode = themeContext?.isDarkMode || false;

  // Logo animations
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoGlow = useRef(new Animated.Value(0)).current;

  // Text animations
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(15)).current;

  // Loading dots
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  // Exit animation
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Dot pulse animation (loops)
    const dotAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(dot1, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot1, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        Animated.timing(dot2, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot2, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        Animated.timing(dot3, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot3, { toValue: 0.3, duration: 300, useNativeDriver: true }),
      ]),
    );

    // Main animation sequence
    Animated.sequence([
      // Small initial delay for native splash transition
      Animated.delay(200),

      // 1. Logo entrance — spring for natural bounce
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),

      // 2. Glow pulse behind logo
      Animated.timing(logoGlow, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),

      // 3. Title slides up + fades in
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // 4. Tagline slides up + fades in
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(taglineTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // 5. Hold for a moment
      Animated.delay(800),

      // 6. Elegant exit — scale up slightly + fade out
      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 500,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(containerScale, {
          toValue: 1.1,
          duration: 500,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      dotAnimation.stop();
      onFinish();
    });

    dotAnimation.start();

    return () => dotAnimation.stop();
  }, []);

  const gradientColors = isDarkMode
    ? ['#1A1A1A', '#0D2818', '#1A1A1A']
    : ['#EFFFFB', '#D4F5E9', '#EFFFFB'];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: containerOpacity,
          transform: [{ scale: containerScale }],
        },
      ]}
    >
      <LinearGradient colors={gradientColors} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.content}>
          {/* Glow circle behind logo */}
          <Animated.View
            style={[
              styles.glowCircle,
              {
                backgroundColor: isDarkMode ? 'rgba(80, 216, 144, 0.08)' : 'rgba(80, 216, 144, 0.12)',
                opacity: logoGlow,
                transform: [{ scale: Animated.multiply(logoGlow, 1) }],
              },
            ]}
          />

          {/* Logo */}
          <Animated.Image
            source={require('../../assets/logo.png')}
            style={[
              styles.logo,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
            resizeMode="contain"
          />

          {/* App title */}
          <Animated.Text
            style={[
              styles.appName,
              {
                color: isDarkMode ? '#FFFFFF' : '#1A1A1A',
                opacity: titleOpacity,
                transform: [{ translateY: titleTranslateY }],
              },
            ]}
          >
            Finansapp
          </Animated.Text>

          {/* Tagline */}
          <Animated.Text
            style={[
              styles.tagline,
              {
                color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
                opacity: taglineOpacity,
                transform: [{ translateY: taglineTranslateY }],
              },
            ]}
          >
            Finansal hayatini kontrol et
          </Animated.Text>
        </View>

        {/* Loading dots at bottom */}
        <View style={styles.dotsContainer}>
          {[dot1, dot2, dot3].map((dot, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: isDarkMode ? '#50D890' : '#50D890',
                  opacity: dot,
                  transform: [{
                    scale: dot.interpolate({
                      inputRange: [0.3, 1],
                      outputRange: [0.8, 1.2],
                    }),
                  }],
                },
              ]}
            />
          ))}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowCircle: {
    position: 'absolute',
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
  },
  logo: {
    width: width * 0.35,
    height: width * 0.35,
    marginBottom: 24,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 10,
    letterSpacing: 0.8,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: height * 0.08,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
