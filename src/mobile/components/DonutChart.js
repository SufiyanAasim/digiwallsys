import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useAppTheme } from '../ThemeContext';

export default function DonutChart({ segments, size = 168, strokeWidth = 20, centerValue, centerLabel }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + Math.max(segment.value, 0), 0);

  let cumulative = 0;
  const arcs = total > 0
    ? segments.map((segment) => {
      const value = Math.max(segment.value, 0);
      const fraction = value / total;
      const dash = fraction * circumference;
      const rotation = (cumulative / total) * 360 - 90;
      cumulative += value;
      return { ...segment, dash, rotation };
    })
    : [];

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.surfaceMuted} strokeWidth={strokeWidth} fill="none" />
        {arcs.map((arc, index) => (
          <Circle
            key={index}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
            strokeLinecap="butt"
            fill="none"
            origin={`${size / 2}, ${size / 2}`}
            rotation={arc.rotation}
          />
        ))}
      </Svg>
      <View style={[styles.centerWrap, { pointerEvents: 'none' }]}>
        <Text style={styles.centerValue} numberOfLines={1}>{centerValue}</Text>
        {!!centerLabel && <Text style={styles.centerLabel} numberOfLines={1}>{centerLabel}</Text>}
      </View>
    </View>
  );
}

export function ChartLegend({ segments }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  return (
    <View style={styles.legend}>
      {segments.map((segment) => (
        <View style={styles.legendRow} key={segment.label}>
          <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
          <Text style={styles.legendLabel}>{segment.label}</Text>
          <Text style={styles.legendValue}>{segment.valueLabel}</Text>
        </View>
      ))}
    </View>
  );
}

function buildStyles(colors) {
  return StyleSheet.create({
    centerWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
    centerValue: { color: colors.text, fontWeight: '800', fontSize: 18, letterSpacing: -0.3 },
    centerLabel: { color: colors.textMuted, fontSize: 10.5, marginTop: 2, textAlign: 'center' },
    legend: { gap: 8 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    legendDot: { width: 9, height: 9, borderRadius: 5 },
    legendLabel: { color: colors.textMuted, fontSize: 12.5, flex: 1 },
    legendValue: { color: colors.text, fontWeight: '700', fontSize: 12.5 },
  });
}
