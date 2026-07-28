import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import GradientButton from './GradientButton';
import Wordmark from './Wordmark';
import { useAppTheme } from '../ThemeContext';
import { radii } from '../theme';

const FEATURES = [
  {
    icon: 'wallet-outline',
    title: 'Multi-currency wallets',
    body: 'Hold a wallet per currency and convert between your own at a published rate.',
  },
  {
    icon: 'people-outline',
    title: 'Shared family wallets',
    body: 'Add a trusted member as an authorized spender, with an optional monthly limit.',
  },
  {
    icon: 'pie-chart-outline',
    title: 'Budgets & savings goals',
    body: 'Tag spend by category against a monthly limit, and earmark savings toward a goal.',
  },
  {
    icon: 'bar-chart-outline',
    title: 'Real-time analytics',
    body: 'See money in, money out, and the spending-lock progress for the current month.',
  },
];

// Web-only marketing section shown above the sign-in panel: a hero, then a
// grid of the product's actual features (nothing here is aspirational copy —
// every line matches a shipped screen). Native skips straight to the form,
// where a full-screen pitch would just be in the way on a phone.
export default function LandingHero({ onGetStarted }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <View style={styles.heroBlock}>
        <Wordmark size={54} />
        <Text style={styles.headline}>Money, held together properly.</Text>
        <Text style={styles.subheadline}>
          A digital wallet with a real double-entry ledger underneath — multi-currency,
          shared, and budgeted, not just a balance and a button.
        </Text>
        <GradientButton label="Get started" onPress={onGetStarted} style={styles.cta} />
      </View>

      <View style={styles.grid}>
        {FEATURES.map((feature) => (
          <View key={feature.title} style={styles.card}>
            <View style={styles.cardIcon}>
              <Icon name={feature.icon} size={20} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>{feature.title}</Text>
            <Text style={styles.cardBody}>{feature.body}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function buildStyles(colors) {
  return StyleSheet.create({
    wrap: { width: '100%', maxWidth: 920, alignSelf: 'center', marginBottom: 48 },
    heroBlock: { alignItems: 'center', paddingVertical: 32, gap: 14 },
    headline: {
      color: colors.text,
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: -0.5,
      textAlign: 'center',
      maxWidth: 620,
    },
    subheadline: {
      color: colors.textMuted,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      maxWidth: 520,
    },
    cta: { marginTop: 10, minWidth: 200 },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      justifyContent: 'center',
    },
    card: {
      flexBasis: 210,
      flexGrow: 1,
      maxWidth: 260,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: radii.lg,
      padding: 18,
      gap: 8,
    },
    cardIcon: {
      width: 38,
      height: 38,
      borderRadius: radii.sm,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: { color: colors.text, fontWeight: '700', fontSize: 14.5 },
    cardBody: { color: colors.textMuted, fontSize: 12.5, lineHeight: 18 },
  });
}
