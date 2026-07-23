import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import TouchableOpacity from '../components/TouchableOpacity';
import { getSchedules } from '../api';
import AmbientBackground from '../components/AmbientBackground';
import { useAppTheme } from '../ThemeContext';
import { radii } from '../theme';
import { formatMoney, getErrorMessage, titleize } from '../utils';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: first.getDay() }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function PaymentCalendarScreen({ navigation }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { colors } = useAppTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setSchedules((await getSchedules()).data.filter((s) => s.status === 'active')); }
    catch (loadError) { setError(getErrorMessage(loadError, 'Scheduled transfers could not be loaded.')); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const today = useMemo(() => new Date(), []);
  const grid = useMemo(() => buildMonthGrid(today.getFullYear(), today.getMonth()), [today]);
  const monthLabel = today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const byDay = useMemo(() => {
    const map = {};
    for (const schedule of schedules) {
      const key = dateKey(new Date(schedule.next_run_at));
      (map[key] ||= []).push(schedule);
    }
    return map;
  }, [schedules]);

  const upcoming = useMemo(
    () => [...schedules].sort((a, b) => new Date(a.next_run_at) - new Date(b.next_run_at)),
    [schedules]
  );

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Payment calendar</Text>
        <Text style={styles.subtitle}>{monthLabel}</Text>

        {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
        {loading && <Text style={styles.meta}>Loading scheduled transfers…</Text>}

        <View style={styles.calendarCard}>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((label, index) => <Text key={index} style={styles.weekLabel}>{label}</Text>)}
          </View>
          <View style={styles.grid}>
            {grid.map((date, index) => {
              const key = date ? dateKey(date) : `blank-${index}`;
              const items = date ? byDay[key] : null;
              const isToday = date && dateKey(date) === dateKey(today);
              return (
                <View key={key} style={styles.cell}>
                  {date && (
                    <>
                      <Text style={[styles.cellLabel, isToday && styles.cellLabelToday]}>{date.getDate()}</Text>
                      {!!items?.length && <View style={styles.dot} />}
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <Text style={styles.heading}>Upcoming transfers</Text>
        {!loading && !error && upcoming.length === 0 && <Text style={styles.meta}>No active scheduled transfers.</Text>}
        {upcoming.map((schedule) => (
          <TouchableOpacity key={schedule.scheduleid} style={styles.scheduleCard} onPress={() => navigation.navigate('Payment Tools')}>
            <View style={styles.scheduleDetails}>
              <Text style={styles.scheduleTitle}>{formatMoney(schedule.amount, schedule.currency)} to {schedule.receiver_name}</Text>
              <Text style={styles.meta}>{titleize(schedule.frequency)} · {new Date(schedule.next_run_at).toLocaleString()}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function buildStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 40, gap: 14 },
    title: { fontSize: 26, fontWeight: '800', color: colors.text },
    subtitle: { color: colors.textMuted, marginTop: -8, marginBottom: 4 },
    meta: { color: colors.textMuted },
    calendarCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radii.lg, padding: 16 },
    weekRow: { flexDirection: 'row' },
    weekLabel: { flex: 1, textAlign: 'center', color: colors.textFaint, fontSize: 11, fontWeight: '700' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
    cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
    cellLabel: { color: colors.textMuted, fontSize: 12.5 },
    cellLabelToday: { color: colors.text, fontWeight: '800' },
    dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary },
    heading: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 6 },
    scheduleCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: radii.md, padding: 14 },
    scheduleDetails: { gap: 3 },
    scheduleTitle: { color: colors.text, fontWeight: '700' },
    errorBox: { backgroundColor: 'rgba(255,107,107,0.12)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)', borderRadius: 14, padding: 12 },
    errorText: { color: colors.danger },
  });
}
