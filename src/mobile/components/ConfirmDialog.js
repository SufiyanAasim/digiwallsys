import { useMemo } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import TouchableOpacity from './TouchableOpacity';
import { useAppTheme } from '../ThemeContext';
import { radii } from '../theme';

// Shared confirmation dialog built from the Aurora Glass tokens, so
// destructive actions confirm in place instead of navigating to a dedicated
// screen. Works identically on mobile and web.
export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  // When provided, the dialog becomes a single-select list ([{label, value}])
  // and onConfirm receives the chosen value instead of acting as a yes/no.
  options = null,
  // Informational: a single acknowledge button, no Cancel.
  infoOnly = false,
  onConfirm,
  onCancel,
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.dialog} accessibilityViewIsModal accessibilityRole="alert">
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}

          {options && (
            <ScrollView style={styles.optionList} keyboardShouldPersistTaps="handled">
              {options.map((option) => (
                <TouchableOpacity
                  key={String(option.value)}
                  style={styles.option}
                  onPress={() => onConfirm(option.value)}
                  accessibilityRole="button"
                >
                  <Text style={styles.optionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.actions}>
            {!infoOnly && (
              <TouchableOpacity
                style={[styles.button, styles.cancel]}
                onPress={onCancel}
                disabled={busy}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </TouchableOpacity>
            )}
            {!options && (
              <TouchableOpacity
                style={[styles.button, destructive ? styles.confirmDestructive : styles.confirm, busy && styles.disabled]}
                onPress={onConfirm}
                disabled={busy}
                accessibilityRole="button"
              >
                <Text style={styles.confirmText}>{busy ? 'Please wait…' : confirmLabel}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function buildStyles(colors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(6,4,8,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    dialog: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.backgroundElevated,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: radii.lg,
      padding: 24,
      ...Platform.select({
        web: { boxShadow: '0 24px 60px rgba(0,0,0,0.45)' },
        default: {
          shadowColor: '#000',
          shadowOpacity: 0.4,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          elevation: 12,
        },
      }),
    },
    title: { color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
    message: { color: colors.textMuted, fontSize: 13.5, lineHeight: 20, marginTop: 10 },
    optionList: { maxHeight: 260, marginTop: 16 },
    option: {
      minHeight: 46,
      justifyContent: 'center',
      paddingHorizontal: 14,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      backgroundColor: colors.surfaceMuted,
      marginBottom: 8,
    },
    optionText: { color: colors.text, fontWeight: '600', fontSize: 14 },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 22 },
    button: {
      minHeight: 44,
      minWidth: 108,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
      borderRadius: radii.pill,
    },
    cancel: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.glassBorder },
    cancelText: { color: colors.text, fontWeight: '700', fontSize: 14 },
    confirm: { backgroundColor: colors.primary },
    confirmDestructive: { backgroundColor: colors.danger },
    confirmText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
    disabled: { opacity: 0.6 },
  });
}
