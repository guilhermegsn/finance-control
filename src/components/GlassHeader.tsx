import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, RadialGradient } from 'react-native-svg';
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

const GlassHeader = ({ title = "ButterFlow" }: GlassHeaderProps) => {
  // Valores animados para as ondas
  const wave1Animation = useSharedValue(0);
  const wave2Animation = useSharedValue(0);
  const wave3Animation = useSharedValue(0);
  const glowAnimation = useSharedValue(0);

  // Animação do título
  const titleAnimation = useSharedValue(0);

  useEffect(() => {
    // Animação contínua das ondas com diferentes timings para criar efeito orgânico
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

    // Animação de brilho pulsante
    glowAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    // Animação sutil do título
    titleAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  // Props animados para a primeira onda
  // Props animados para a primeira onda (Larga, suave e profunda)
  // Props animados para a primeira onda (Mais curta)
  // Props animados para a primeira onda (Foco na ESQUERDA)
  const animatedWave1Props = useAnimatedProps(() => {
    const animatedD = `
      M 0 0
      L 0 ${interpolate(wave1Animation.value, [0, 1], [40, 60])}
      C ${width * 0.15} ${interpolate(wave1Animation.value, [0, 1], [70, 90])},
        ${width * 0.35} ${interpolate(wave1Animation.value, [0, 1], [30, 45])},
        ${width * 0.55} ${interpolate(wave1Animation.value, [0, 1], [20, 10])}
      S ${width * 0.8} ${interpolate(wave1Animation.value, [0, 1], [10, 20])},
        ${width} ${interpolate(wave1Animation.value, [0, 1], [15, 10])}
      L ${width} 0
      Z
    `;

    return {
      d: animatedD,
      opacity: interpolate(glowAnimation.value, [0.3, 1], [0.5, 0.7]),
    };
  });

  // Props animados para a segunda onda (Foco no CENTRO)
  const animatedWave2Props = useAnimatedProps(() => {
    const animatedD = `
      M 0 0
      L 0 ${interpolate(wave2Animation.value, [0, 1], [15, 25])}
      C ${width * 0.25} ${interpolate(wave2Animation.value, [0, 1], [20, 35])},
        ${width * 0.5} ${interpolate(wave2Animation.value, [0, 1], [80, 100])},
        ${width * 0.75} ${interpolate(wave2Animation.value, [0, 1], [25, 40])}
      S ${width * 0.9} ${interpolate(wave2Animation.value, [0, 1], [10, 20])},
        ${width} ${interpolate(wave2Animation.value, [0, 1], [20, 30])}
      L ${width} 0
      Z
    `;

    return {
      d: animatedD,
      opacity: interpolate(glowAnimation.value, [0.3, 1], [0.4, 0.6]),
    };
  });

  // Props animados para a terceira onda (Foco na DIREITA)
  const animatedWave3Props = useAnimatedProps(() => {
    const animatedD = `
      M 0 0
      L 0 ${interpolate(wave3Animation.value, [0, 1], [10, 20])}
      C ${width * 0.2} ${interpolate(wave3Animation.value, [0, 1], [20, 15])},
        ${width * 0.5} ${interpolate(wave3Animation.value, [0, 1], [20, 30])},
        ${width * 0.7} ${interpolate(wave3Animation.value, [0, 1], [30, 75])}
      S ${width * 0.95} ${interpolate(wave3Animation.value, [0, 1], [10, 20])},
        ${width} ${interpolate(wave3Animation.value, [0, 1], [30, 25])}
      L ${width} 0
      Z
    `;

    return {
      d: animatedD,
      opacity: interpolate(glowAnimation.value, [0.3, 1], [0.6, 0.8]),
    };
  });
  // Estilo animado para o título
  const animatedTitleStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: interpolate(titleAnimation.value, [0, 1], [0, -2]) },
      ],
      opacity: interpolate(titleAnimation.value, [0, 0.5, 1], [0.9, 1, 0.9]),
    };
  });

  return (
    <View style={styles.container}>
      {/* Camada 1: Fundo com gradiente */}
      <View style={styles.backgroundContainer} />

      {/* Camada 2: Ondas Vetoriais Animadas (O Fluxo) */}
      <View style={styles.svgContainer}>
        <Svg height="100%" width="100%" viewBox={`0 0 ${width} 90`}>
          <Defs>
            {/* Gradiente principal - turquesa para violeta */}
            <LinearGradient id="waveGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#00F5A0" stopOpacity="0.8" />
              <Stop offset="50%" stopColor="#00D9F5" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#9D00FF" stopOpacity="0.8" />
            </LinearGradient>

            {/* Gradiente secundário - ciano para turquesa */}
            <LinearGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#00BFFF" stopOpacity="0.8" />
              <Stop offset="50%" stopColor="#00F5A0" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#7B68EE" stopOpacity="0.8" />
            </LinearGradient>

            {/* Gradiente terciário - violeta para ciano */}
            <LinearGradient id="waveGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#9D00FF" stopOpacity="0.8" />
              <Stop offset="50%" stopColor="#00D9F5" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#00F5A0" stopOpacity="0.8" />
            </LinearGradient>

            {/* Gradiente de brilho para efeitos especiais */}
            <RadialGradient
              id="glowGradient"
              cx="50%"
              cy="50%"
              rx="50%"
              ry="50%"
              fx="50%"
              fy="50%"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Ondas animadas */}
          <AnimatedPath
            animatedProps={animatedWave1Props}
            fill="url(#waveGradient1)"
          />

          <AnimatedPath
            animatedProps={animatedWave2Props}
            fill="url(#waveGradient2)"
          />

          <AnimatedPath
            animatedProps={animatedWave3Props}
            fill="url(#waveGradient3)"
          />
        </Svg>
      </View>

      {/* Camada 3: Glassmorphism (O Vidro) */}
      <View
        // intensity={Platform.OS === 'ios' ? 25 : 60}
        style={styles.blurContainer}
      //    tint="trams" // <--- Mude para transparent
      >
        <View style={styles.content}>
          <Animated.Text style={[styles.title, animatedTitleStyle]}>
            {title}
          </Animated.Text>
        </View>
      </View>

      {/* Borda inferior sutil para o efeito de vidro */}
      <View style={styles.glassBorder} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 90,
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    // backgroundColor: 'rgba(10, 10, 30, 0.7)', // Fundo escuro profundo
  },
  svgContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    justifyContent: 'flex-end',
    paddingBottom: 15,
    // backgroundColor: 'rgba(20, 20, 40, 0.2)', // Cor base para o efeito de vidro
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
    // color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: 1.2, // Espaçamento entre letras para um look premium
    textShadowColor: 'rgba(0, 217, 245, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  glassBorder: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 0.5,
    //backgroundColor: 'rgba(255, 255, 255, 0.15)', // Borda sutil
    zIndex: 3,
  }
});

export default GlassHeader;