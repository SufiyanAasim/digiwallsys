export const colors = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceMuted: '#334155',
  primary: '#E11D48',
  primaryDark: '#020617',
  accent: '#38BDF8',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  border: '#334155',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  disabled: '#475569',
};

export const navigationTheme = {
  dark: true,
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
