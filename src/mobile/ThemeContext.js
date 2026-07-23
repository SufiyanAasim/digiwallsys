import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildCommonStyles, buildGlow, buildNavigationTheme, darkColors, lightColors } from './theme';

const STORAGE_KEY = 'digiwallsys.theme';

const ThemeContext = createContext({
  isDark: true,
  toggleTheme: () => {},
  colors: darkColors,
  commonStyles: buildCommonStyles(darkColors),
  navigationTheme: buildNavigationTheme(darkColors),
  glow: buildGlow(darkColors),
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light') setIsDark(false);
      if (stored === 'dark') setIsDark(true);
    }).catch(() => {});
  }, []);

  const toggleTheme = () => {
    setIsDark((previous) => {
      const next = !previous;
      AsyncStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  };

  const value = useMemo(() => {
    const colors = isDark ? darkColors : lightColors;
    return {
      isDark,
      toggleTheme,
      colors,
      commonStyles: buildCommonStyles(colors),
      navigationTheme: buildNavigationTheme(colors),
      glow: buildGlow(colors),
    };
  }, [isDark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
