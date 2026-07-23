import React from 'react';
import { Pressable } from 'react-native';

export default function TouchableOpacity({ style, activeOpacity = 0.2, ...props }) {
  return (
    <Pressable
      {...props}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        state.pressed && { opacity: activeOpacity },
      ]}
    />
  );
}
