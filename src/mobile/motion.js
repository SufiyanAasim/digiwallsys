import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const MotionContext = createContext({ reduceMotion: false });
const nativeDriver = Platform.OS !== 'web';

export function MotionProvider({ children }) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(Boolean(enabled));
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      setReduceMotion
    );
    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  const value = useMemo(() => ({ reduceMotion }), [reduceMotion]);
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export function useMotion() {
  return useContext(MotionContext);
}

export function MotionScreen({ children, routeKey, style }) {
  const { reduceMotion } = useMotion();
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    progress.stopAnimation();
    if (reduceMotion) {
      progress.setValue(1);
      return undefined;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: nativeDriver,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion, routeKey]);

  return (
    <Animated.View
      style={[
        { flex: 1 },
        style,
        {
          opacity: progress,
          transform: [{
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [reduceMotion ? 0 : 10, 0],
            }),
          }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function MotionSection({
  children,
  delay = 0,
  distance = 12,
  horizontal = false,
  style,
}) {
  const { reduceMotion } = useMotion();
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    progress.stopAnimation();
    if (reduceMotion) {
      progress.setValue(1);
      return undefined;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 460,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: nativeDriver,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, progress, reduceMotion]);

  const offset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [reduceMotion ? 0 : distance, 0],
  });

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [horizontal ? { translateX: offset } : { translateY: offset }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export const motionDriver = nativeDriver;
