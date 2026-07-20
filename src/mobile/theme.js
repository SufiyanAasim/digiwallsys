export const colors = {
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

export const navigationTheme = {
  dark: false,
  colors: {
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};

export const commonStyles = {
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 36 },
  input: {
    minHeight: 48,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 15,
    color: colors.text,
  },
  primaryButton: {
    minHeight: 48,
    backgroundColor: colors.primary,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700' },
  secondaryButton: {
    minHeight: 48,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  secondaryButtonText: { color: colors.primaryDark, fontWeight: '700' },
};
