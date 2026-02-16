import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

/**
 * AnimatedScreen - Wraps screen content with staggered fade-in + slide-up animation.
 * Each child block animates in sequentially when the screen gains focus.
 *
 * Usage:
 *   <AnimatedScreen>
 *     <View>Block 1</View>
 *     <View>Block 2</View>
 *   </AnimatedScreen>
 *
 * Or wrap the entire screen content as a single child for a simple fade-in.
 */
const AnimatedScreen = ({ children, delay = 0, duration = 400, slideDistance = 30, style }) => {
  const navigation = useNavigation();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(slideDistance)).current;

  const animate = () => {
    // Reset values
    opacity.setValue(0);
    translateY.setValue(slideDistance);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration,
        delay: delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: duration,
        delay: delay,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    // Animate on mount
    animate();

    // Animate on focus (tab switch)
    const unsubscribe = navigation.addListener('focus', () => {
      animate();
    });

    return unsubscribe;
  }, [navigation]);

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

/**
 * StaggeredItem - Individual item within a staggered animation sequence.
 * Use this to wrap each block/card that should animate in with a delay.
 *
 * Usage:
 *   <StaggeredItem index={0}><Card /></StaggeredItem>
 *   <StaggeredItem index={1}><Card /></StaggeredItem>
 */
export const StaggeredItem = ({ children, index = 0, duration = 350, staggerDelay = 80, slideDistance = 24, style }) => {
  const navigation = useNavigation();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(slideDistance)).current;

  const animate = () => {
    opacity.setValue(0);
    translateY.setValue(slideDistance);

    const delay = index * staggerDelay;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration,
        delay: delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: delay,
        useNativeDriver: true,
        damping: 20,
        stiffness: 150,
        mass: 0.8,
      }),
    ]).start();
  };

  useEffect(() => {
    animate();

    const unsubscribe = navigation.addListener('focus', () => {
      animate();
    });

    return unsubscribe;
  }, [navigation]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AnimatedScreen;
