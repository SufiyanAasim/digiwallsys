import { useEffect, useMemo, useState } from 'react';
import TouchableOpacity from '../components/TouchableOpacity';

import {  Alert, ScrollView, StyleSheet, Text, TextInput, View  } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Picker } from '@react-native-picker/picker';
import QRCode from 'react-native-qrcode-svg';
import { acceptPaymentRequest, createPaymentRequest, getPaymentRequest, getWallets } from '../api';
import AmbientBackground from '../components/AmbientBackground';
import { useConfirm } from '../components/ConfirmProvider';
import { useToast } from '../components/ToastProvider';
import GradientButton from '../components/GradientButton';
import { useAppTheme } from '../ThemeContext';
import { contentColumn, layout, screenBackground } from '../theme';
import { formatMoney, getErrorMessage, parsePositiveAmount } from '../utils';

export default function QrPaymentScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState('menu');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [payload, setPayload] = useState('');
  const [scanned, setScanned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [currencies, setCurrencies] = useState([]);
  const [currency, setCurrency] = useState('USD');
  const { colors, commonStyles } = useAppTheme();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const styles = useMemo(() => buildStyles(colors, commonStyles), [colors, commonStyles]);

  useEffect(() => {
    getWallets().then((response) => {
      const items = response.data.map((wallet) => wallet.currency);
      setCurrencies(items);
      if (!items.includes(currency) && items[0]) setCurrency(items[0]);
    }).catch(() => {});
  }, [currency]);

  async function generate() {
    const parsedAmount = parsePositiveAmount(amount);
    if (parsedAmount === null) {
      Alert.alert('Invalid amount', 'Enter a positive amount with up to two decimal places.');
      return;
    }
    setBusy(true);
    try {
      const response = await createPaymentRequest(null, parsedAmount, note.trim(), currency);
      setPayload(response.data.qrPayload);
      setMode('generate');
    } catch (error) { Alert.alert('QR request failed', getErrorMessage(error)); }
    finally { setBusy(false); }
  }

  async function scan({ data }) {
    if (scanned) return;
    setScanned(true);
    const match = /^digiwallsys:\/\/request\/([0-9a-f-]+)$/i.exec(data);
    if (!match) { Alert.alert('Invalid QR code', 'This is not a digiwallsys payment request.'); setScanned(false); return; }
    try {
      const request = (await getPaymentRequest(match[1])).data;
      // In-app dialog rather than Alert with buttons: browsers suppress the
      // window.confirm() the web Alert polyfill falls back to.
      const ok = await confirm({
        title: 'Pay this request?',
        message: `${request.requester_name} requested ${formatMoney(request.amount, request.currency)}.`,
        confirmLabel: 'Pay',
      });
      if (!ok) { setScanned(false); return; }
      try {
        await acceptPaymentRequest(request.requestid);
        showToast('Payment sent', 'The payment request was completed.');
        navigation.navigate('Home');
      } catch (payError) { Alert.alert('Payment failed', getErrorMessage(payError)); setScanned(false); }
    } catch (error) { Alert.alert('Request unavailable', getErrorMessage(error)); setScanned(false); }
  }

  if (mode === 'scan') {
    if (!permission?.granted) return <View style={styles.center}><AmbientBackground /><Text style={styles.permissionText}>{permission?.canAskAgain === false ? 'Camera access is disabled. Enable it in your device settings to scan payment codes.' : 'Camera permission is required to scan payment codes.'}</Text>{permission?.canAskAgain !== false && <GradientButton label="Allow camera" onPress={requestPermission} />}<TouchableOpacity style={styles.back} onPress={() => setMode('menu')}><Text style={styles.backText}>Back</Text></TouchableOpacity></View>;
    return <View style={styles.container}><CameraView style={styles.camera} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={scan} /><TouchableOpacity style={styles.back} onPress={() => setMode('menu')}><Text style={styles.backText}>Cancel scan</Text></TouchableOpacity></View>;
  }

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>QR payments</Text>
        {payload ? <View style={styles.qr}><QRCode value={payload} size={220} /><Text style={styles.meta}>Scan to pay {formatMoney(amount, currency)}</Text><TouchableOpacity style={styles.linkButton} onPress={() => { setPayload(''); setAmount(''); setNote(''); }}><Text style={styles.secondaryText}>Create another request</Text></TouchableOpacity></View> : <>
          <TextInput style={styles.input} placeholder="Amount to request" placeholderTextColor={colors.textFaint} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
          <Picker selectedValue={currency} onValueChange={setCurrency} style={styles.picker} enabled={!busy}>
            {currencies.map((item) => <Picker.Item key={item} label={`${item} wallet`} value={item} />)}
          </Picker>
          <TextInput style={styles.input} placeholder="Note" placeholderTextColor={colors.textFaint} value={note} onChangeText={setNote} />
          <GradientButton label={busy ? 'Generating…' : 'Generate request QR'} disabled={busy} onPress={generate} />
        </>}
        <TouchableOpacity style={styles.secondary} onPress={() => { setScanned(false); setMode('scan'); }}><Text style={styles.secondaryText}>Scan payment QR</Text></TouchableOpacity>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Text style={styles.backText}>Back</Text></TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function buildStyles(colors, commonStyles) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: screenBackground(colors) }, center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24, backgroundColor: screenBackground(colors) }, content: { flex: 1, padding: 24, gap: 14, ...contentColumn(layout.form) },
    title: { fontSize: 26, fontWeight: '800', color: colors.text }, input: commonStyles.input,
    picker: commonStyles.picker,
    secondary: { minHeight: 48, justifyContent: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 22, padding: 15, alignItems: 'center' },
    secondaryText: { color: colors.text, fontWeight: '700' }, qr: { alignItems: 'center', gap: 12, marginVertical: 20 }, meta: { color: colors.textMuted }, permissionText: { color: colors.text, textAlign: 'center', lineHeight: 21 }, linkButton: { minHeight: 48, justifyContent: 'center' },
    camera: { flex: 1 }, back: { alignItems: 'center', padding: 18 }, backText: { color: colors.textMuted, fontWeight: '600' },
  });
}
