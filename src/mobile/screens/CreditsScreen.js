import React from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { colors } from '../theme';

export default function CreditsScreen() {
  const openGitHub = () => {
    Linking.openURL('https://github.com/SufiyanAasim/digiwallsys');
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.headerCard}>
          <Image source={require('../assets/digiwallsys-icon.png')} style={styles.logo} />
          <Text style={styles.title}>digiwallsys</Text>
          <Text style={styles.tagline}>Digital Wallet & Financial Accounting System</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}><Text style={styles.badgeText}>v1.5.5</Text></View>
            <View style={[styles.badge, styles.badgeAccent]}><Text style={styles.badgeText}>"Armada"</Text></View>
            <View style={[styles.badge, styles.badgeSuccess]}><Text style={styles.badgeText}>Production Release</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👨‍💻 System Architect & Creator</Text>
          <View style={styles.card}>
            <Text style={styles.nameText}>Mohammad Sufiyan Aasim</Text>
            <Text style={styles.roleText}>System Architecture · Financial Core · Mobile & Web Release</Text>
            <TouchableOpacity style={styles.githubButton} onPress={openGitHub} accessibilityRole="button">
              <Icon name="logo-github" size={20} color="#FFFFFF" />
              <Text style={styles.githubButtonText}>@SufiyanAasim/digiwallsys</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Technology Stack</Text>
          <View style={styles.card}>
            <View style={styles.techRow}>
              <Text style={styles.techKey}>Backend Engine</Text>
              <Text style={styles.techVal}>Node.js 20 · Express.js REST API</Text>
            </View>
            <View style={styles.techRow}>
              <Text style={styles.techKey}>Database & Ledger</Text>
              <Text style={styles.techVal}>Managed Supabase PostgreSQL 16</Text>
            </View>
            <View style={styles.techRow}>
              <Text style={styles.techKey}>Web & Mobile Client</Text>
              <Text style={styles.techVal}>React Native · Expo SDK 53 · Metro Web</Text>
            </View>
            <View style={styles.techRow}>
              <Text style={styles.techKey}>Containerization</Text>
              <Text style={styles.techVal}>Docker · Multi-stage Alpine Production Build</Text>
            </View>
            <View style={styles.techRow}>
              <Text style={styles.techKey}>Cloud Hosting</Text>
              <Text style={styles.techVal}>Render.com (API) · Vercel (Dashboard)</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛡️ Core Features</Text>
          <View style={styles.card}>
            <Text style={styles.bullet}>• Double-Entry Immutable Ledger Accounting</Text>
            <Text style={styles.bullet}>• Provider-Verified Webhooks & Idempotent Transactions</Text>
            <Text style={styles.bullet}>• QR Payment Generation & Barcode Scanning</Text>
            <Text style={styles.bullet}>• Recurring Transfers & Automated Schedules</Text>
            <Text style={styles.bullet}>• Real-time Fraud Engine & Admin Reconciliation</Text>
            <Text style={styles.bullet}>• Secure Token Rotation & Biometric Authentication</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>MIT License © 2026 Mohammad Sufiyan Aasim</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: 20, paddingBottom: 40 },
  headerCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 24, alignItems: 'center', borderColor: colors.border, borderWidth: 1, marginBottom: 20 },
  logo: { width: 80, height: 80, borderRadius: 20, marginBottom: 12 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text, marginBottom: 4 },
  tagline: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: 16 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  badge: { backgroundColor: colors.surfaceMuted, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeAccent: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: colors.accent, borderWidth: 1 },
  badgeSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: colors.success, borderWidth: 1 },
  badgeText: { fontSize: 13, fontWeight: '700', color: colors.text },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 10 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, borderColor: colors.border, borderWidth: 1 },
  nameText: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
  roleText: { fontSize: 13, color: colors.textMuted, marginBottom: 14 },
  githubButton: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, alignSelf: 'flex-start' },
  githubButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  techRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomColor: colors.border, borderBottomWidth: 0.5 },
  techKey: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  techVal: { fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'right', flex: 1, marginLeft: 10 },
  bullet: { fontSize: 14, color: colors.text, paddingVertical: 4 },
  footer: { alignItems: 'center', marginTop: 10 },
  footerText: { fontSize: 12, color: colors.textMuted },
});
