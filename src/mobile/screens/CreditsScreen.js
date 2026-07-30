import { useMemo } from 'react';
import TouchableOpacity from '../components/TouchableOpacity';

import {  Image, Linking, ScrollView, StyleSheet, Text, View  } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import AmbientBackground from '../components/AmbientBackground';
import Logo from '../components/Logo';
import Wordmark from '../components/Wordmark';
import { MotionSection } from '../motion';
import { useAppTheme } from '../ThemeContext';
import { screenBackground } from '../theme';

// Section headings used to lead with an emoji (👨‍💻 / ⚡ / 🛡️), which renders as
// whatever the OS font decides and sits at odds with the Ionicons used
// everywhere else in the app. A themed icon keeps the same scannability
// without the mismatch.
function SectionTitle({ icon, children, colors, styles }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Icon name={icon} size={17} color={colors.primary} />
      <Text style={styles.sectionTitle}>{children}</Text>
    </View>
  );
}

export default function CreditsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const openGitHub = () => {
    Linking.openURL('https://github.com/SufiyanAasim');
  };

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
        <MotionSection style={styles.headerCard} distance={16}>
          <Logo size={72} />
          <View style={styles.titleWrap}><Wordmark size={28} /></View>
          <Text style={styles.tagline}>Digital Wallet & Financial Accounting System</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}><Text style={styles.badgeText}>v1.8.5</Text></View>
            <View style={[styles.badge, styles.badgeAccent]}><Text style={styles.badgeText}>"Trench"</Text></View>
            <View style={[styles.badge, styles.badgeSuccess]}><Text style={styles.badgeText}>Deployed</Text></View>
          </View>
        </MotionSection>

        <MotionSection style={styles.section} delay={90}>
          <SectionTitle icon="person-circle-outline" colors={colors} styles={styles}>System Architect &amp; Creator</SectionTitle>
          <View style={styles.card}>
            <View style={styles.architectRow}>
              <Image
                source={{ uri: 'https://github.com/SufiyanAasim.png' }}
                style={styles.avatar}
                accessibilityLabel="GitHub profile picture of Sufiyan Aasim"
              />
              <View style={styles.architectText}>
                <Text style={styles.nameText}>Sufiyan Aasim</Text>
                <Text style={styles.roleText}>System Architecture · Financial Core · Mobile & Web Release</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.githubButton} onPress={openGitHub} accessibilityRole="button">
              <Icon name="logo-github" size={20} color="#FFFFFF" />
              <Text style={styles.githubButtonText}>@SufiyanAasim</Text>
            </TouchableOpacity>
          </View>
        </MotionSection>

        <MotionSection style={styles.section} delay={160}>
          <SectionTitle icon="layers-outline" colors={colors} styles={styles}>Technology Stack</SectionTitle>
          <View style={styles.card}>
            <View style={styles.techRow}>
              <Text style={styles.techKey}>Backend Engine</Text>
              <Text style={styles.techVal}>Node.js 20 · Express.js REST API</Text>
            </View>
            <View style={styles.techRow}>
              <Text style={styles.techKey}>Database & Ledger</Text>
              <Text style={styles.techVal}>PostgreSQL 14+ · Immutable ledger</Text>
            </View>
            <View style={styles.techRow}>
              <Text style={styles.techKey}>Web & Mobile Client</Text>
              <Text style={styles.techVal}>React Native · Expo SDK 57 · Metro Web</Text>
            </View>
            <View style={styles.techRow}>
              <Text style={styles.techKey}>Containerization</Text>
              <Text style={styles.techVal}>Docker · Reproducible Alpine build</Text>
            </View>
            <View style={styles.techRow}>
              <Text style={styles.techKey}>Cloud Hosting</Text>
              <Text style={styles.techVal}>Vercel · Render · Supabase</Text>
            </View>
          </View>
        </MotionSection>

        <MotionSection style={styles.section} delay={230}>
          <SectionTitle icon="shield-checkmark-outline" colors={colors} styles={styles}>Core Features</SectionTitle>
          <View style={styles.card}>
            <Text style={styles.bullet}>• Double-Entry Immutable Ledger Accounting</Text>
            <Text style={styles.bullet}>• Provider-Verified Webhooks & Idempotent Transactions</Text>
            <Text style={styles.bullet}>• QR Payment Generation & Barcode Scanning</Text>
            <Text style={styles.bullet}>• Recurring Transfers & Automated Schedules</Text>
            <Text style={styles.bullet}>• Real-time Fraud Engine & Admin Reconciliation</Text>
            <Text style={styles.bullet}>• Secure Token Rotation & Biometric Authentication</Text>
          </View>
        </MotionSection>

        <MotionSection style={styles.footer} delay={300}>
          <Text style={styles.footerText}>MIT License © 2026 Sufiyan Aasim</Text>
        </MotionSection>
        </View>
      </ScrollView>
    </View>
  );
}

function buildStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: screenBackground(colors) },
    container: { padding: 20, paddingBottom: 40, alignItems: 'center' },
    // Credits reads as a centered page rather than stretching across a wide monitor.
    inner: { width: '100%', maxWidth: 820 },
    headerCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 24, alignItems: 'center', borderColor: colors.border, borderWidth: 1, marginBottom: 20 },
    titleWrap: { marginTop: 14, marginBottom: 4 },
    architectRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 14 },
    architectText: { flex: 1 },
    avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: colors.borderStrong, backgroundColor: colors.surfaceMuted },
    tagline: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: 16 },
    badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
    badge: { backgroundColor: colors.surfaceMuted, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    badgeAccent: { backgroundColor: colors.accentSoft, borderColor: colors.accent, borderWidth: 1 },
    badgeSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: colors.success, borderWidth: 1 },
    badgeText: { fontSize: 13, fontWeight: '700', color: colors.text },
    section: { marginBottom: 20 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
    card: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, borderColor: colors.border, borderWidth: 1 },
    nameText: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
    roleText: { fontSize: 13, color: colors.textMuted },
    githubButton: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, alignSelf: 'flex-start' },
    githubButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
    techRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomColor: colors.border, borderBottomWidth: 0.5 },
    techKey: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    techVal: { fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'right', flex: 1, marginLeft: 10 },
    bullet: { fontSize: 14, color: colors.text, paddingVertical: 4 },
    footer: { alignItems: 'center', marginTop: 10 },
    footerText: { fontSize: 12, color: colors.textMuted },
  });
}
