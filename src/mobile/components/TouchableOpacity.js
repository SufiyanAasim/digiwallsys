import { useRef } from 'react';
import { Animated, Easing, Pressable } from 'react-native';
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

  const animate = (value, duration = 150) => {
    scale.stopAnimation();
    if (reduceMotion || disabled) {
      scale.setValue(1);
      return;
    }
    Animated.timing(scale, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: motionDriver,
    }).start();
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
        animate(0.975, 90);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animate(1, 170);
        onPressOut?.(event);
      }}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        state.pressed && { opacity: activeOpacity },
        { transform: [{ scale }] },
      ]}
    />
  );
}
