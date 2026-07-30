import { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { motionDriver, useMotion } from '../motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function TouchableOpacity({
  style,
  activeOpacity = 0.78,
  disabled,
  onHoverIn,
  onHoverOut,
  onPressIn,
  onPressOut,
  ...props
}) {
  const { reduceMotion } = useMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const animate = (value, duration = 150, nextOpacity = 1) => {
    scale.stopAnimation();
    opacity.stopAnimation();
    if (reduceMotion || disabled) {
      scale.setValue(1);
      opacity.setValue(nextOpacity);
      return;
    }
    Animated.parallel([
      Animated.timing(scale, {
        toValue: value,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: motionDriver,
      }),
      Animated.timing(opacity, {
        toValue: nextOpacity,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: motionDriver,
      }),
    ]).start();
  };

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onHoverIn={(event) => {
        animate(1.018, 180);
        onHoverIn?.(event);
      }}
      onHoverOut={(event) => {
        animate(1, 180);
        onHoverOut?.(event);
      }}
      onPressIn={(event) => {
        animate(0.975, 90, activeOpacity);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animate(1, 170);
        onPressOut?.(event);
      }}
      style={[
        // Animated Pressable does not consistently preserve a state-callback
        // style on React Native Web. Keep caller layout styles in the direct
        // style array and animate feedback values independently.
        StyleSheet.flatten(typeof style === 'function' ? style({ pressed: false }) : style),
        { opacity, transform: [{ scale }] },
      ]}
    />
  );
}
