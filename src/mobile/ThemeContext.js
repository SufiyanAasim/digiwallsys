import React, { createContext, useContext, useState } from 'react';
import { colors as darkColors } from './theme';

export const lightColors = {
  background: '#FFF8F3',
  surface: '#FFFFFF',
  surfaceMuted: '#FBEDE5',
  primary: '#C6533C',
  primaryDark: '#713B49',
  accent: '#E9A23B',
  text: '#2E2027',
  textMuted: '#76656C',
  border: '#EADCD6',
  success: '#287A55',
  danger: '#B53E45',
  warning: '#9A641D',
  disabled: '#C8BBB7',
};

const ThemeContext = createContext({
  isDark: true,
  toggleTheme: () => {},
  colors: darkColors,
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => setIsDark((prev) => !prev);
  const currentColors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors: currentColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
