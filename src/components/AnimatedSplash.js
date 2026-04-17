import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { fonts } from '../utils/theme';

const { width, height } = Dimensions.get('window');

export default function AnimatedSplash({ onFinish }) {
  const opacity      = useRef(new Animated.Value(0)).current;
  const scale        = useRef(new Animated.Value(0.75)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY       = useRef(new Animated.Value(16)).current;
  const fadeOut      = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Logo apparaît avec un léger scale-up
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
      // 2. Titre glisse vers le haut
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(titleY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),
      // 3. Pause
      Animated.delay(700),
      // 4. Tout disparaît
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 380,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish?.();
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      {/* Halo derrière le logo */}
      <Animated.View
        style={[
          styles.halo,
          {
            opacity: Animated.multiply(opacity, 0.35),
            transform: [{ scale }],
          },
        ]}
      />

      {/* Logo */}
      <Animated.Image
        source={require('../../assets/favicon_io/android-chrome-512x512.png')}
        style={[
          styles.logo,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
        resizeMode="contain"
      />

      {/* Titre */}
      <Animated.View
        style={{
          opacity: titleOpacity,
          transform: [{ translateY: titleY }],
          alignItems: 'center',
        }}
      >
        <Text style={styles.title}>PokeCollect</Text>

      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 28,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontFamily: fonts.extrabold,
    fontWeight: '800',
    letterSpacing: 1,
  },
  subtitle: {
    color: '#555',
    fontSize: 13,
    marginTop: 6,
    letterSpacing: 0.5,
  },
});
