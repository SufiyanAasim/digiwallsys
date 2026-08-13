import { Platform, StyleSheet, Text } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../ThemeContext';

export default function Wordmark({ size = 22, style }) {
  const { colors } = useAppTheme();
  const textStyle = [styles.text, { fontSize: size, lineHeight: size * 1.15 }];

  // @react-native-masked-view has no real web implementation, so react-native-web
  // never clips the gradient to the glyph shapes there — use CSS background-clip instead.
  if (Platform.OS === 'web') {
    return (
      <Text
        style={[
          textStyle,
          style,
          {
            backgroundImage: `linear-gradient(90deg, ${colors.gradientPrimary[0]}, ${colors.gradientPrimary[1]})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          },
        ]}
      >
        digiwallsys
      </Text>
    );
  }

  return (
    <MaskedView style={[styles.wrap, style]} maskElement={<Text style={textStyle}>digiwallsys</Text>}>
      <LinearGradient colors={colors.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.4 }}>
        <Text style={[textStyle, styles.hidden]}>digiwallsys</Text>
      </LinearGradient>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  wrap: { minWidth: 0 },
  text: { fontWeight: '800', letterSpacing: -0.5, color: '#000' },
  hidden: { opacity: 0 },
});
