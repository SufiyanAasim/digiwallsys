import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

// Every line below describes something that actually ships -- no aspirational
// copy. The steps mirror the real onboarding order (verify email -> fund and
// budget -> send/share/track) and the trust row names features that exist in
// the backend today.
const STEPS = [
  {
    icon: 'person-add-outline',
    title: 'Create your account',
    body: 'Sign up and verify your email. Sessions sit behind short-lived access tokens and rotating refresh tokens.',
  },
  {
    icon: 'options-outline',
    title: 'Fund it and set your limits',
    body: 'Add money through a payment provider, then set monthly budget categories and earmark savings goals.',
  },
  {
    icon: 'swap-horizontal-outline',
    title: 'Send, share, and track',
    body: 'Send in any currency you hold, add family as authorized spenders, and follow every movement in analytics.',
  },
];

const TRUST = [
  { icon: 'git-compare-outline', label: 'Double-entry ledger' },
  { icon: 'refresh-outline', label: 'Rotating refresh tokens' },
  { icon: 'finger-print-outline', label: 'Biometric unlock' },
  { icon: 'pulse-outline', label: 'Fraud velocity checks' },
];

// Three soft, slowly drifting glows behind the hero copy -- purely decorative,
// scoped to this component only (the app-wide AmbientBackground behind every
// other screen is untouched). Each loops opacity and a small vertical drift
// on its own offset timer so they never move in lockstep.
const ORBS = [
  { top: -60, left: -40, size: 220, colorKey: 'gradientAmbientTop', duration: 7000, delay: 0 },
  { top: 40, right: -60, size: 260, colorKey: 'gradientAmbientBottom', duration: 8200, delay: 600 },
  { top: 180, left: '38%', size: 160, colorKey: 'gradientAmbientTop', duration: 6400, delay: 1200 },
];

function GlowOrbs({ colors }) {
  const animsRef = useRef(ORBS.map(() => new Animated.Value(0)));

  useEffect(() => {
    const loops = animsRef.current.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(ORBS[index].delay),
          Animated.timing(value, { toValue: 1, duration: ORBS[index].duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: ORBS[index].duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, []);

  return (
    <View style={decorativeStyles.orbLayer} pointerEvents="none">
      {ORBS.map((orb, index) => {
        const value = animsRef.current[index];
        return (
          <Animated.View
            key={index}
            style={[
              decorativeStyles.orb,
              {
                top: orb.top,
                left: orb.left,
                right: orb.right,
                width: orb.size,
                height: orb.size,
                borderRadius: orb.size,
                backgroundColor: colors[orb.colorKey],
                opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] }),
                transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function FeatureCard({ feature, colors, styles, index }) {
  const enter = useRef(new Animated.Value(0)).current;
  const hover = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 420,
      delay: 150 + index * 90,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  function setHovered(hovered) {
    Animated.timing(hover, { toValue: hovered ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [
          { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
          { translateY: hover.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
          { scale: hover.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) },
        ],
      }}
    >
      <Pressable style={styles.card} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}>
        <View style={styles.cardIcon}>
          <Icon name={feature.icon} size={20} color={colors.primary} />
        </View>
        <Text style={styles.cardTitle}>{feature.title}</Text>
        <Text style={styles.cardBody}>{feature.body}</Text>
      </Pressable>
    </Animated.View>
  );
}

// Numbered step. Hovering lifts the step and turns its number chip from a
// flat tint into the live brand gradient, so the row responds to the pointer
// rather than sitting inert.
function StepCard({ step, index, colors, styles }) {
  const enter = useRef(new Animated.Value(0)).current;
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 420,
      delay: 520 + index * 110,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  return (
    <Animated.View
      style={{
        flexBasis: 260,
        flexGrow: 1,
        maxWidth: 320,
        opacity: enter,
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
      }}
    >
      <Pressable
        style={[styles.step, hovered && styles.stepHovered]}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
      >
        <View style={styles.stepHead}>
          {hovered ? (
            <LinearGradient colors={colors.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stepNumber}>
              <Text style={styles.stepNumberTextOn}>{index + 1}</Text>
            </LinearGradient>
          ) : (
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
          )}
          <Icon name={step.icon} size={18} color={hovered ? colors.primary : colors.textMuted} />
        </View>
        <Text style={styles.stepTitle}>{step.title}</Text>
        <Text style={styles.stepBody}>{step.body}</Text>
      </Pressable>
    </Animated.View>
  );
}

// Web-only marketing section shown above the sign-in panel: a hero, then a
// grid of the product's actual features (nothing here is aspirational copy —
// every line matches a shipped screen). Native skips straight to the form,
// where a full-screen pitch would just be in the way on a phone.
export default function LandingHero({ onGetStarted }) {
  const { colors } = useAppTheme();
  const themedStyles = useMemo(() => buildStyles(colors), [colors]);
  const heroEnter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(heroEnter, {
      toValue: 1,
      duration: 480,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [heroEnter]);


  return (
    <View style={themedStyles.wrap}>
      <GlowOrbs colors={colors} />
      <Animated.View
        style={[
          themedStyles.heroBlock,
          {
            opacity: heroEnter,
            transform: [{ translateY: heroEnter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          },
        ]}
      >
        <Wordmark size={54} />
        <Text style={themedStyles.headline}>Money, held together properly.</Text>
        <Text style={themedStyles.subheadline}>
          A digital wallet with a real double-entry ledger underneath — multi-currency,
          shared, and budgeted, not just a balance and a button.
        </Text>
        <GradientButton label="Get started" onPress={onGetStarted} style={themedStyles.cta} />
      </Animated.View>

      <View style={themedStyles.grid}>
        {FEATURES.map((feature, index) => (
          <FeatureCard key={feature.title} feature={feature} colors={colors} styles={themedStyles} index={index} />
        ))}
      </View>

      <View style={themedStyles.section}>
        <Text style={themedStyles.sectionHeading}>How it works</Text>
        <View style={themedStyles.stepsRow}>
          {STEPS.map((step, index) => (
            <StepCard key={step.title} step={step} index={index} colors={colors} styles={themedStyles} />
          ))}
        </View>
      </View>

      <View style={themedStyles.trustRow}>
        {TRUST.map((item) => (
          <View key={item.label} style={themedStyles.trustItem}>
            <Icon name={item.icon} size={15} color={colors.primary} />
            <Text style={themedStyles.trustLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const decorativeStyles = StyleSheet.create({
  orbLayer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  orb: { position: 'absolute', filter: Platform.OS === 'web' ? 'blur(40px)' : undefined },
});

function buildStyles(colors) {
  return StyleSheet.create({
    wrap: { width: '100%', maxWidth: 920, alignSelf: 'center', marginBottom: 48, position: 'relative' },
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
      ...Platform.select({
        web: { boxShadow: '0 0 0 rgba(0,0,0,0)', transitionProperty: 'border-color', transitionDuration: '180ms' },
        default: null,
      }),
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

    section: { marginTop: 44 },
    sectionHeading: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: -0.3,
      textAlign: 'center',
      marginBottom: 20,
    },
    stepsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
    step: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: radii.lg,
      padding: 18,
      gap: 10,
      minHeight: 172,
    },
    stepHovered: { borderColor: colors.borderStrong },
    stepHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    stepNumber: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    stepNumberText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
    stepNumberTextOn: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
    stepTitle: { color: colors.text, fontWeight: '700', fontSize: 14.5 },
    stepBody: { color: colors.textMuted, fontSize: 12.5, lineHeight: 18 },

    trustRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      justifyContent: 'center',
      marginTop: 34,
    },
    trustItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingVertical: 8,
      paddingHorizontal: 13,
      borderRadius: radii.pill,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    trustLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  });
}
