import { 
  MD3DarkTheme as PaperDarkTheme, 
  MD3LightTheme as PaperLightTheme,
  adaptNavigationTheme
} from 'react-native-paper';
import { 
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
} from '@react-navigation/native';

const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
});

// Criar temas combinados mantendo a estrutura correta do react-native-paper
export const CombinedDefaultTheme = {
  ...PaperLightTheme,
  ...LightTheme,
  colors: {
    ...PaperLightTheme.colors,
    ...LightTheme.colors,
  },
  fonts: PaperLightTheme.fonts, // Manter as fontes do react-native-paper
};

export const CombinedDarkTheme = {
  ...PaperDarkTheme,
  ...DarkTheme,
  colors: {
    ...PaperDarkTheme.colors,
    ...DarkTheme.colors,
  },
  fonts: PaperDarkTheme.fonts, // Manter as fontes do react-native-paper
};
