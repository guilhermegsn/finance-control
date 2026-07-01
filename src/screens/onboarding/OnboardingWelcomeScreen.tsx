import React, { useRef, useState } from 'react';
import {
  View, StyleSheet, ScrollView, Text, TouchableOpacity, Dimensions,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: 'wallet-outline',
    title: 'Bem-vindo ao ButterFlow',
    description: 'Seu controle financeiro pessoal, funcionando mesmo offline. Tudo o que você lança fica salvo no seu aparelho e sincroniza automaticamente quando você estiver online.',
  },
  {
    icon: 'bank-outline',
    title: 'Comece com uma conta',
    description: 'Para o app funcionar, você precisa cadastrar pelo menos uma conta (corrente, poupança ou investimento). Vamos criar a primeira agora.',
  },
  {
    icon: 'credit-card-outline',
    title: 'Cartões de crédito',
    description: 'Você também pode cadastrar seus cartões para acompanhar faturas e parcelamentos. Esse passo é opcional e pode ser feito a qualquer momento pelo Menu.',
  },
  {
    icon: 'sync',
    title: 'Transações recorrentes',
    description: 'Lance receitas e despesas fixas, como salário e assinaturas, como transações recorrentes e deixe o ButterFlow lançá-las automaticamente todo mês.',
  },
];

export default function OnboardingWelcomeScreen({ navigation }: any) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  const isLast = activeIndex === SLIDES.length - 1;

  const goNext = () => {
    if (!isLast) {
      const nextIndex = activeIndex + 1;
      scrollRef.current?.scrollTo({ x: width * nextIndex, animated: true });
      setActiveIndex(nextIndex);
    } else {
      navigation.navigate('Account');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        style={styles.scroll}
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <LinearGradient
              colors={['#6366F1', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconWrap}
            >
              <Icon source={slide.icon} size={40} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.title, { color: theme.text }]}>{slide.title}</Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>{slide.description}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.dots}>
          {SLIDES.map((slide, index) => (
            <View
              key={slide.title}
              style={[
                styles.dot,
                { backgroundColor: index === activeIndex ? theme.primary : theme.border },
                index === activeIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity onPress={goNext} activeOpacity={0.85} style={styles.ctaBtn}>
          <LinearGradient
            colors={['#6366F1', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>{isLast ? 'Vamos começar' : 'Próximo'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 20,
  },
  ctaBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
