export const colors = {
  background: '#0B0A10',
  backgroundElevated: '#150F13',
  surface: 'rgba(255,255,255,0.055)',
  surfaceStrong: 'rgba(255,255,255,0.09)',
  surfaceMuted: 'rgba(255,255,255,0.045)',
  primary: '#FF5470',
  primaryDark: '#0B0A10',
  primarySoft: 'rgba(255,84,112,0.16)',
  accent: '#FFA45B',
  accentSoft: 'rgba(255,164,91,0.16)',
  text: '#F9F3EF',
  textMuted: '#B7A9AE',
  textFaint: '#8C7F84',
  border: 'rgba(255,132,150,0.16)',
  borderStrong: 'rgba(255,132,150,0.32)',
  glassBorder: 'rgba(255,255,255,0.10)',
  success: '#3ED598',
  danger: '#FF6B6B',
  warning: '#FFC24B',
  disabled: 'rgba(255,255,255,0.08)',
  gradientPrimary: ['#FF5470', '#FFA45B'],
  gradientAmbientTop: 'rgba(255,84,112,0.20)',
  gradientAmbientBottom: 'rgba(255,164,91,0.12)',
};

export const navigationTheme = {
  dark: true,
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

export const radii = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

export const glow = {
  shadowColor: colors.primary,
  shadowOpacity: 0.35,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
};

export const commonStyles = {
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 36 },
  glassCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.lg,
    padding: 18,
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
  primaryButton: {
    minHeight: 50,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: '#1A0A0E', fontWeight: '800', fontSize: 15, letterSpacing: -0.1 },
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
