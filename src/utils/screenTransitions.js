/**
 * Custom Screen Transitions
 * Smooth animations for screen transitions
 */

import { Animated, Easing, Dimensions } from 'react-native';

const { height, width } = Dimensions.get('window');

/**
 * Vertical Split Transition
 * Top section slides from top, bottom section slides from bottom
 */
export const verticalSplitTransition = {
  gestureDirection: 'vertical',
  transitionSpec: {
    open: {
      animation: 'timing',
      config: {
        duration: 500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      },
    },
    close: {
      animation: 'timing',
      config: {
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      },
    },
  },
  cardStyleInterpolator: ({ current, layouts }) => {
    const translateY = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [layouts.screen.height, 0],
    });

    const opacity = current.progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.5, 1],
    });

    return {
      cardStyle: {
        transform: [{ translateY }],
        opacity,
      },
    };
  },
};

/**
 * Slide Up Transition (from bottom)
 */
export const slideUpTransition = {
  gestureDirection: 'vertical',
  transitionSpec: {
    open: {
      animation: 'spring',
      config: {
        stiffness: 1000,
        damping: 500,
        mass: 3,
        overshootClamping: true,
        restDisplacementThreshold: 10,
        restSpeedThreshold: 10,
      },
    },
    close: {
      animation: 'timing',
      config: {
        duration: 300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      },
    },
  },
  cardStyleInterpolator: ({ current, layouts }) => {
    return {
      cardStyle: {
        transform: [
          {
            translateY: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.height, 0],
            }),
          },
        ],
      },
    };
  },
};

/**
 * Slide Down Transition (from top)
 */
export const slideDownTransition = {
  gestureDirection: 'vertical',
  transitionSpec: {
    open: {
      animation: 'spring',
      config: {
        stiffness: 1000,
        damping: 500,
        mass: 3,
        overshootClamping: true,
        restDisplacementThreshold: 10,
        restSpeedThreshold: 10,
      },
    },
    close: {
      animation: 'timing',
      config: {
        duration: 300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      },
    },
  },
  cardStyleInterpolator: ({ current, layouts }) => {
    return {
      cardStyle: {
        transform: [
          {
            translateY: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [-layouts.screen.height, 0],
            }),
          },
        ],
      },
    };
  },
};

/**
 * Fade Scale Transition
 */
export const fadeScaleTransition = {
  gestureDirection: 'horizontal',
  transitionSpec: {
    open: {
      animation: 'timing',
      config: {
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      },
    },
    close: {
      animation: 'timing',
      config: {
        duration: 300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      },
    },
  },
  cardStyleInterpolator: ({ current, next }) => {
    return {
      cardStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        }),
        transform: [
          {
            scale: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.9, 1],
            }),
          },
        ],
      },
      overlayStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.5],
        }),
      },
    };
  },
};

/**
 * Smooth Slide Horizontal
 */
export const smoothSlideTransition = {
  gestureDirection: 'horizontal',
  transitionSpec: {
    open: {
      animation: 'spring',
      config: {
        stiffness: 1000,
        damping: 100,
        mass: 3,
        overshootClamping: false,
        restDisplacementThreshold: 10,
        restSpeedThreshold: 10,
      },
    },
    close: {
      animation: 'spring',
      config: {
        stiffness: 1000,
        damping: 100,
        mass: 3,
        overshootClamping: false,
        restDisplacementThreshold: 10,
        restSpeedThreshold: 10,
      },
    },
  },
  cardStyleInterpolator: ({ current, next, layouts }) => {
    return {
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width, 0],
            }),
          },
          {
            scale: next
              ? next.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.95],
                })
              : 1,
          },
        ],
        opacity: current.progress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 1, 1],
        }),
      },
      overlayStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.3],
        }),
      },
    };
  },
};

/**
 * Card Flip Transition
 */
export const cardFlipTransition = {
  gestureDirection: 'horizontal',
  transitionSpec: {
    open: {
      animation: 'timing',
      config: {
        duration: 500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      },
    },
    close: {
      animation: 'timing',
      config: {
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      },
    },
  },
  cardStyleInterpolator: ({ current, layouts }) => {
    const rotateY = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: ['90deg', '0deg'],
    });

    const opacity = current.progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0, 1],
    });

    return {
      cardStyle: {
        opacity,
        transform: [
          { perspective: 1000 },
          { rotateY },
        ],
      },
    };
  },
};

/**
 * Modal Slide Up with Fade
 */
export const modalSlideTransition = {
  gestureDirection: 'vertical',
  transitionSpec: {
    open: {
      animation: 'spring',
      config: {
        stiffness: 300,
        damping: 30,
        mass: 1,
      },
    },
    close: {
      animation: 'timing',
      config: {
        duration: 250,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      },
    },
  },
  cardStyleInterpolator: ({ current, layouts }) => {
    const translateY = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [layouts.screen.height, 0],
    });

    const borderRadius = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [30, 0],
    });

    return {
      cardStyle: {
        transform: [{ translateY }],
        borderTopLeftRadius: borderRadius,
        borderTopRightRadius: borderRadius,
      },
    };
  },
  cardOverlayEnabled: true,
  overlayStyle: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
};

export default {
  verticalSplitTransition,
  slideUpTransition,
  slideDownTransition,
  fadeScaleTransition,
  smoothSlideTransition,
  cardFlipTransition,
  modalSlideTransition,
};
