import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../ThemeContext';
import { motionDriver, useMotion } from '../motion';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

// Soft mint/cyan glow behind every screen. The blobs are sized from the actual
// viewport so the glow fills a wide desktop monitor edge to edge instead of
// sitting as two small circles in the middle of the page.
// Screen-level usage. On web the shell paints one AmbientLayer across the whole
// content area, so screens must not paint a second one — that produced a
// brighter band wherever the capped content column sat. On native each screen
// still paints its own.
export default function AmbientBackground() {
  if (Platform.OS === 'web') return null;
  return <AmbientLayer />;
}

// Always paints. Used by the web shell (and by AmbientBackground on native).
export function AmbientLayer() {
  const { colors } = useAppTheme();
  const { reduceMotion } = useMotion();
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const topMotion = useRef(new Animated.Value(0)).current;
  const bottomMotion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    topMotion.stopAnimation();
    bottomMotion.stopAnimation();
    if (reduceMotion) {
      topMotion.setValue(0);
      bottomMotion.setValue(0);
      return undefined;
    }
    const topLoop = Animated.loop(Animated.sequence([
      Animated.timing(topMotion, {
        toValue: 1,
        duration: 12000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: motionDriver,
      }),
      Animated.timing(topMotion, {
        toValue: 0,
        duration: 12000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: motionDriver,
      }),
    ]));
    const bottomLoop = Animated.loop(Animated.sequence([
      Animated.timing(bottomMotion, {
        toValue: 1,
        duration: 15000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: motionDriver,
      }),
      Animated.timing(bottomMotion, {
        toValue: 0,
        duration: 15000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: motionDriver,
      }),
    ]));
    topLoop.start();
    bottomLoop.start();
    return () => {
      topLoop.stop();
      bottomLoop.stop();
    };
  }, [bottomMotion, reduceMotion, topMotion]);

  // On web scale with the viewport (never smaller than a phone-sized blob);
  // on native keep the original fixed sizes.
  const topSize = isWeb ? Math.max(width * 0.85, height * 0.9, 520) : 420;
  const bottomSize = isWeb ? Math.max(width * 0.7, height * 0.8, 460) : 380;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background, pointerEvents: 'none' }]}>
      <LinearGradient colors={[colors.background, colors.background]} style={StyleSheet.absoluteFill} />
      <AnimatedGradient
        colors={[colors.gradientAmbientTop, 'transparent']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.7, y: 0.55 }}
        style={[
          styles.blob,
          {
            top: -topSize * 0.3,
            left: -topSize * 0.2,
            width: topSize,
            height: topSize,
            borderRadius: topSize,
            opacity: topMotion.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }),
            transform: [
              { translateX: topMotion.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) },
              { translateY: topMotion.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }) },
              { scale: topMotion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) },
            ],
          },
        ]}
      />
      <AnimatedGradient
        colors={[colors.gradientAmbientBottom, 'transparent']}
        start={{ x: 1, y: 0.1 }}
        end={{ x: 0.2, y: 0.7 }}
        style={[
          styles.blob,
          {
            top: isWeb ? height * 0.18 : 160,
            right: -bottomSize * 0.28,
            width: bottomSize,
            height: bottomSize,
            borderRadius: bottomSize,
            opacity: bottomMotion.interpolate({ inputRange: [0, 1], outputRange: [0.68, 0.95] }),
            transform: [
              { translateX: bottomMotion.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }) },
              { translateY: bottomMotion.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) },
              { scale: bottomMotion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // `position: absolute` (StyleSheet.absoluteFillObject) sizes this to its
  // nearest positioned ancestor's own box -- on web that ancestor is a flex
  // container sized to the viewport, not to the page's full scrollable
  // height. Any screen taller than one viewport (this shell now regularly is,
  // with LandingHero and the fixed public footer) scrolled the gradient out
  // of view partway down, leaving the browser's plain white page background
  // exposed underneath the rest of the content. `fixed` anchors to the
  // viewport itself regardless of document height, so it always covers
  // exactly what's on screen. Native keeps absoluteFillObject: its ScrollViews
  // clip to their own bounds, so this mismatch does not exist there.
  wrap: Platform.select({
    web: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
    default: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  }),
  blob: { position: 'absolute' },
});
