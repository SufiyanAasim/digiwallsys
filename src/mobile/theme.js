import { Platform } from 'react-native';

export const darkColors = {
  mode: 'dark',
  background: '#001A15',
  backgroundElevated: '#06251F',
  surface: 'rgba(20,72,62,0.46)',
  surfaceStrong: 'rgba(24,92,78,0.64)',
  surfaceMuted: 'rgba(33,111,94,0.20)',
  primary: '#31D1A7',
  primaryDark: '#001A15',
  primarySoft: 'rgba(49,209,167,0.15)',
  accent: '#2CA7D3',
  accentSoft: 'rgba(44,167,211,0.15)',
  text: '#E8F8F4',
  textMuted: '#9FCBC0',
  textFaint: '#70A89A',
  border: 'rgba(49,209,167,0.18)',
  borderStrong: 'rgba(49,209,167,0.38)',
  glassBorder: 'rgba(155,241,220,0.15)',
  success: '#46E6B8',
  danger: '#FF6B7A',
  warning: '#F6C85F',
  disabled: 'rgba(105,165,151,0.14)',
  gradientPrimary: ['#31D1A7', '#2CA7D3'],
  gradientAmbientTop: 'rgba(49,209,167,0.18)',
  gradientAmbientBottom: 'rgba(44,167,211,0.14)',
  chartSeries: ['#31D1A7', '#2CA7D3', '#7DE4D1', '#5792DE'],
};

// Aurora Glass Light keeps the mint/cyan identity on a cool, low-glare canvas.
export const lightColors = {
  mode: 'light',
  background: '#EFFAF7',
  backgroundElevated: '#FFFFFF',
  surface: 'rgba(255,255,255,0.78)',
  surfaceStrong: 'rgba(255,255,255,0.92)',
  surfaceMuted: 'rgba(7,87,72,0.06)',
  primary: '#087F68',
  primaryDark: '#EFFAF7',
  primarySoft: 'rgba(8,127,104,0.10)',
  accent: '#167FA8',
  accentSoft: 'rgba(22,127,168,0.10)',
  text: '#0A3028',
  textMuted: '#426E64',
  textFaint: '#688E85',
  border: 'rgba(8,127,104,0.15)',
  borderStrong: 'rgba(8,127,104,0.30)',
  glassBorder: 'rgba(7,87,72,0.13)',
  success: '#087F68',
  danger: '#C53030',
  warning: '#8A6511',
  disabled: 'rgba(7,87,72,0.10)',
  gradientPrimary: ['#0B9B7E', '#167FA8'],
  gradientAmbientTop: 'rgba(49,209,167,0.12)',
  gradientAmbientBottom: 'rgba(44,167,211,0.10)',
  chartSeries: ['#087F68', '#167FA8', '#39A995', '#496FC7'],
};

export function buildNavigationTheme(colors) {
  return {
    dark: colors.mode === 'dark',
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.backgroundElevated,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' },
      medium: { fontFamily: 'System', fontWeight: '500' },
      bold: { fontFamily: 'System', fontWeight: '700' },
      heavy: { fontFamily: 'System', fontWeight: '900' },
    },
  };
}

export const radii = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

// Readable measure caps for the web build. Mobile keeps full-bleed width, so
// these only ever apply when Platform.OS === 'web' (see contentColumn below).
export const layout = {
  form: 640,   // single-column forms: inputs stay a usable width on a monitor
  page: 900,   // prose/detail pages
  wide: 1180,  // dashboards and grids
};

// Spread into a ScrollView contentContainerStyle (or a View style) to centre
// and cap content on web while leaving mobile layout untouched.
export function contentColumn(maxWidth = layout.form) {
  return Platform.OS === 'web'
    ? { width: '100%', maxWidth, alignSelf: 'center' }
    : null;
}

// Background for a screen's outermost container. On web the shell already
// paints the page colour and one ambient gradient behind every screen, so an
// opaque screen background would cover the glow and leave a flat black page.
// On native each screen paints its own, because there is no shell layer.
export function screenBackground(colors) {
  return Platform.OS === 'web' ? 'transparent' : colors.background;
}

export function buildGlow(colors) {
  return Platform.select({
    web: { boxShadow: `0 12px 28px ${colors.primary}45` },
    default: {
      shadowColor: colors.primary,
      shadowOpacity: 0.35,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
  });
}

export function buildCommonStyles(colors) {
  return {
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 36 },
    glassCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: radii.lg,
      padding: 18,
      ...Platform.select({
        web: {
          backdropFilter: 'blur(18px) saturate(125%)',
          WebkitBackdropFilter: 'blur(18px) saturate(125%)',
          boxShadow: '0 16px 48px rgba(0,36,29,0.20)',
        },
        default: {
          shadowColor: '#001A15',
          shadowOpacity: 0.18,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 3,
        },
      }),
    },
    input: {
      minHeight: 50,
      backgroundColor: colors.surface,
      borderColor: colors.glassBorder,
      borderWidth: 1,
      borderRadius: radii.md,
      paddingHorizontal: 16,
      color: colors.text,
    },
    picker: {
      minHeight: 50,
      backgroundColor: colors.surface,
      borderColor: colors.glassBorder,
      borderWidth: 1,
      borderRadius: radii.md,
      paddingHorizontal: 12,
      color: colors.text,
      justifyContent: 'center',
    },
    primaryButton: {
      minHeight: 50,
      backgroundColor: colors.primary,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
    },
    primaryButtonText: { color: colors.primaryDark, fontWeight: '800', fontSize: 15, letterSpacing: -0.1 },
    secondaryButton: {
      minHeight: 50,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
    },
    secondaryButtonText: { color: colors.text, fontWeight: '700' },
  };
}

// Back-compat static exports for any non-component code (e.g. app.json-adjacent
// scripts) that only ever needs the default (dark) palette.
export const colors = darkColors;
export const navigationTheme = buildNavigationTheme(darkColors);
export const commonStyles = buildCommonStyles(darkColors);
export const glow = buildGlow(darkColors);
