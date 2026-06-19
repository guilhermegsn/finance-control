import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  withSequence,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface GlassHeaderProps {
  title?: string;
}

const GlassHeader = ({ title = "" }: GlassHeaderProps) => {
  const wave1Animation = useSharedValue(0);
  const wave2Animation = useSharedValue(0);
  const wave3Animation = useSharedValue(0);
  const glowAnimation = useSharedValue(0);
  const titleAnimation = useSharedValue(0);

  useEffect(() => {
    wave1Animation.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    wave2Animation.value = withDelay(
      400,
      withRepeat(
        withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.quad) }),
        -1,
        true
      )
    );

    wave3Animation.value = withDelay(
      800,
      withRepeat(
        withTiming(1, { duration: 10000, easing: Easing.inOut(Easing.cubic) }),
        -1,
        true
      )
    );

    glowAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    titleAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  // Onda 1 — foco na esquerda, profunda
  const animatedWave1Props = useAnimatedProps(() => {
    const animatedD = `
      M 0 0
      L 0 ${interpolate(wave1Animation.value, [0, 1], [25, 40])}
      C ${width * 0.15} ${interpolate(wave1Animation.value, [0, 1], [45, 60])},
        ${width * 0.35} ${interpolate(wave1Animation.value, [0, 1], [25, 38])},
        ${width * 0.55} ${interpolate(wave1Animation.value, [0, 1], [18, 10])}
      S ${width * 0.8} ${interpolate(wave1Animation.value, [0, 1], [10, 18])},
        ${width} ${interpolate(wave1Animation.value, [0, 1], [12, 8])}
      L ${width} 0
      Z
    `;
    return {
      d: animatedD,
      opacity: interpolate(glowAnimation.value, [0.3, 1], [0.5, 0.7]),
    };
  });

  // Onda 2 — pico no centro
  const animatedWave2Props = useAnimatedProps(() => {
    const animatedD = `
      M 0 0
      L 0 ${interpolate(wave2Animation.value, [0, 1], [12, 20])}
      C ${width * 0.25} ${interpolate(wave2Animation.value, [0, 1], [18, 30])},
        ${width * 0.5} ${interpolate(wave2Animation.value, [0, 1], [45, 60])},
        ${width * 0.75} ${interpolate(wave2Animation.value, [0, 1], [22, 35])}
      S ${width * 0.9} ${interpolate(wave2Animation.value, [0, 1], [10, 18])},
        ${width} ${interpolate(wave2Animation.value, [0, 1], [18, 25])}
      L ${width} 0
      Z
    `;
    return {
      d: animatedD,
      opacity: interpolate(glowAnimation.value, [0.3, 1], [0.4, 0.6]),
    };
  });

  // Onda 3 — sweep na direita
  const animatedWave3Props = useAnimatedProps(() => {
    const animatedD = `
      M 0 0
      L 0 ${interpolate(wave3Animation.value, [0, 1], [8, 15])}
      C ${width * 0.2} ${interpolate(wave3Animation.value, [0, 1], [15, 12])},
        ${width * 0.5} ${interpolate(wave3Animation.value, [0, 1], [18, 28])},
        ${width * 0.7} ${interpolate(wave3Animation.value, [0, 1], [28, 58])}
      S ${width * 0.95} ${interpolate(wave3Animation.value, [0, 1], [10, 18])},
        ${width} ${interpolate(wave3Animation.value, [0, 1], [25, 20])}
      L ${width} 0
      Z
    `;
    return {
      d: animatedD,
      opacity: interpolate(glowAnimation.value, [0.3, 1], [0.6, 0.8]),
    };
  });

  const animatedTitleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(titleAnimation.value, [0, 1], [0, -2]) }],
    opacity: interpolate(titleAnimation.value, [0, 0.5, 1], [0.9, 1, 0.9]),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.svgContainer}>
        <Svg height="100%" width="100%" viewBox={`0 0 ${width} 90`}>
          <Defs>
            {/* Violeta profundo → roxo médio */}
            <LinearGradient id="waveGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#6D28D9" stopOpacity="0.95" />
              <Stop offset="50%" stopColor="#7C3AED" stopOpacity="1" />
              <Stop offset="100%" stopColor="#A855F7" stopOpacity="0.85" />
            </LinearGradient>

            {/* Roxo médio → lilás */}
            <LinearGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#7C3AED" stopOpacity="0.8" />
              <Stop offset="50%" stopColor="#C084FC" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#7C3AED" stopOpacity="0.75" />
            </LinearGradient>

            {/* Escuro → violeta */}
            <LinearGradient id="waveGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#4C1D95" stopOpacity="0.9" />
              <Stop offset="50%" stopColor="#7C3AED" stopOpacity="0.95" />
              <Stop offset="100%" stopColor="#6D28D9" stopOpacity="0.85" />
            </LinearGradient>
          </Defs>

          <AnimatedPath animatedProps={animatedWave1Props} fill="url(#waveGradient1)" />
          <AnimatedPath animatedProps={animatedWave2Props} fill="url(#waveGradient2)" />
          <AnimatedPath animatedProps={animatedWave3Props} fill="url(#waveGradient3)" />
        </Svg>
      </View>

      <View style={styles.overlay}>
        <View style={styles.content}>
          <Animated.Text style={[styles.title, animatedTitleStyle]}>
            {title}
          </Animated.Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 90,
    width: '100%',
    overflow: 'hidden',
  },
  svgContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    justifyContent: 'flex-end',
    paddingBottom: 15,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
});

export default GlassHeader;
