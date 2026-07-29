import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useAppTheme } from '../ThemeContext';
import { radii } from '../theme';

const ToastContext = createContext({ showToast: () => {} });

const ICONS = { success: 'checkmark', info: 'information-circle', error: 'alert-circle' };
const DURATION = 3200;

export function ToastProvider({ children }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [toast, setToast] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef(null);

  const hide = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start(() => setToast(null));
  }, [anim]);

  const showToast = useCallback((title, message, type = 'success') => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setToast({ title, message, type });
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: Platform.OS !== 'web', bounciness: 6 }).start();
    hideTimer.current = setTimeout(hide, DURATION);
  }, [anim, hide]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <View style={styles.root}>
        {children}
        {toast && (
          <Animated.View
            style={[
              styles.toast,
              {
                opacity: anim,
                transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
              },
            ]}
          >
            <View style={styles.iconWrap}>
              <Icon name={ICONS[toast.type] || ICONS.success} size={14} color={colors.mode === 'light' ? '#FFFFFF' : '#1A0A0E'} />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.title} numberOfLines={1}>{toast.title}</Text>
              {!!toast.message && <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>}
            </View>
          </Animated.View>
        )}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

function buildStyles(colors) {
  return StyleSheet.create({
    root: { flex: 1 },
    toast: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 56 : 28,
      left: 16,
      right: 16,
      backgroundColor: colors.mode === 'light' ? 'rgba(255,255,255,0.96)' : 'rgba(20,14,17,0.92)',
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: radii.lg,
      paddingVertical: 12,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      ...Platform.select({
        web: { boxShadow: `0 8px 18px ${colors.primary}66` },
        default: {
          shadowColor: colors.primary,
          shadowOpacity: 0.4,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 10,
        },
      }),
      zIndex: 999,
    },
    iconWrap: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textWrap: { flex: 1 },
    title: { color: colors.text, fontWeight: '800', fontSize: 13.5 },
    message: { color: colors.textMuted, fontSize: 11.5, marginTop: 1 },
  });
}
