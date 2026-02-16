import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

const defaultColors = {
  primary: '#50D890',
  secondary: '#4F98CA',
  background: '#EFFFFB',
  card: '#FFFFFF',
  text: '#272727',
  textLight: '#666666',
};

const slides = [
  { key: '1', icon: 'trending-up', color: '#50D890', titleKey: 'onboarding.slide1Title', descKey: 'onboarding.slide1Desc' },
  { key: '2', icon: 'credit-card', color: '#4F98CA', titleKey: 'onboarding.slide2Title', descKey: 'onboarding.slide2Desc' },
  { key: '3', icon: 'target', color: '#F39C12', titleKey: 'onboarding.slide3Title', descKey: 'onboarding.slide3Desc' },
];

const OnboardingScreen = ({ onComplete }) => {
  const { t } = useLanguage();
  const themeContext = useTheme();
  const colors = themeContext?.colors || defaultColors;
  const isDarkMode = themeContext?.isDarkMode || false;
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleComplete = async () => {
    await AsyncStorage.setItem('onboarding_completed', 'true');
    onComplete();
  };

  const handleNext = () => {
    if (activeIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      handleComplete();
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderSlide = ({ item }) => (
    <View style={[styles.slide, { width }]}>
      <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
        <Feather name={item.icon} size={80} color={item.color} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{t(item.titleKey)}</Text>
      <Text style={[styles.description, { color: colors.textLight }]}>{t(item.descKey)}</Text>
    </View>
  );

  const isLastSlide = activeIndex === slides.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
      />

      <View style={styles.dotContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: index === activeIndex ? colors.primary : (isDarkMode ? '#555' : '#D0D0D0'),
                width: index === activeIndex ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      <View style={[styles.footer, { paddingBottom: 20 }]}>
        <TouchableOpacity onPress={handleComplete} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: colors.textLight }]}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNext}
          style={[styles.nextButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.nextText}>
            {isLastSlide ? t('onboarding.getStarted') : t('onboarding.next')}
          </Text>
          {!isLastSlide && <Feather name="arrow-right" size={18} color="#FFF" style={{ marginLeft: 6 }} />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  skipButton: {
    padding: 16,
  },
  skipText: {
    fontSize: 16,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  nextText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OnboardingScreen;
