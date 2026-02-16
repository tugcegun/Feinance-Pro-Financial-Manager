import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_MARGIN = 16;
const TAB_BAR_WIDTH = SCREEN_WIDTH - TAB_BAR_MARGIN * 2;

const ICON_MAP = {
  Home: 'home',
  Transactions: 'list',
  Bills: 'file-text',
  Accounts: 'credit-card',
  Profile: 'user',
};

const LiquidGlassTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const themeContext = useTheme();
  const isDarkMode = themeContext?.isDarkMode || false;

  const tabCount = state.routes.length;
  const tabWidth = TAB_BAR_WIDTH / tabCount;

  const indicatorAnim = useRef(new Animated.Value(state.index * tabWidth)).current;

  useEffect(() => {
    Animated.spring(indicatorAnim, {
      toValue: state.index * tabWidth,
      useNativeDriver: true,
      damping: 18,
      stiffness: 120,
      mass: 0.8,
    }).start();
  }, [state.index]);

  const handleTabPress = (route, index, isFocused) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  const bottomOffset = Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : 14;

  return (
    <View style={[styles.wrapper, { bottom: bottomOffset }]}>
      {/* Drop shadow */}
      <View style={[
        styles.shadowLayer,
        isDarkMode && styles.shadowLayerDark,
      ]} />

      {/* Glass container - no border */}
      <View style={styles.glassContainer}>
        {/* Cam efekti - blur */}
        <BlurView
          intensity={isDarkMode ? 50 : 70}
          tint={isDarkMode ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />

        {/* Hafif tint */}
        <View style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDarkMode
              ? 'rgba(15,15,25,0.4)'
              : 'rgba(255,255,255,0.1)',
          },
        ]} />

        {/* Active tab pill - sadece cam, çerçevesiz */}
        <Animated.View
          style={[
            styles.activePill,
            {
              width: tabWidth - 12,
              transform: [{ translateX: Animated.add(indicatorAnim, 6) }],
              backgroundColor: isDarkMode
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(255,255,255,0.45)',
            },
          ]}
        />

        {/* Tab icons */}
        <View style={styles.tabsRow}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const iconName = ICON_MAP[route.name] || 'circle';

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onPress={() => handleTabPress(route, index, isFocused)}
                activeOpacity={0.7}
                style={styles.tabButton}
              >
                <Feather
                  name={iconName}
                  size={22}
                  color={isFocused
                    ? (isDarkMode ? '#FFFFFF' : '#000000')
                    : (isDarkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)')
                  }
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: TAB_BAR_MARGIN,
    right: TAB_BAR_MARGIN,
    alignItems: 'center',
  },
  shadowLayer: {
    position: 'absolute',
    top: 2,
    left: 10,
    right: 10,
    bottom: -2,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 1, height: 1 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
    }),
  },
  shadowLayerDark: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    ...Platform.select({
      ios: { shadowOpacity: 0.4 },
      android: {},
    }),
  },
  glassContainer: {
    width: '100%',
    height: 56,
    borderRadius: 30,
    overflow: 'hidden',
  },
  activePill: {
    position: 'absolute',
    top: 6,
    height: 44,
    borderRadius: 22,
    zIndex: 2,
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
});

export default LiquidGlassTabBar;
