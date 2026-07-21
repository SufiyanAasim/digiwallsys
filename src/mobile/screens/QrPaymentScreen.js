import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { acceptPaymentRequest, createPaymentRequest, getPaymentRequest } from '../api';
import { colors, commonStyles } from '../theme';
import { formatMoney, getErrorMessage, parsePositiveAmount } from '../utils';

export default function QrPaymentScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState('menu');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [payload, setPayload] = useState('');
  const [scanned, setScanned] = useState(false);
  const [busy, setBusy] = useState(false);

  async function generate() {
    const parsedAmount = parsePositiveAmount(amount);
    if (parsedAmount === null) {
      Alert.alert('Invalid amount', 'Enter a positive amount with up to two decimal places.');
      return;
    }
    setBusy(true);
    try {
      const response = await createPaymentRequest(null, parsedAmount, note.trim());
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
      Alert.alert(
        'Pay request?',
        `${request.requester_name} requested ${formatMoney(request.amount, request.currency)}.`,
        [
          { text: 'Cancel', onPress: () => setScanned(false) },
          { text: 'Pay', onPress: async () => {
            try { await acceptPaymentRequest(request.requestid); Alert.alert('Paid', 'Payment request completed.'); navigation.navigate('Home'); }
            catch (error) { Alert.alert('Payment failed', getErrorMessage(error)); setScanned(false); }
          } },
        ]
      );
    } catch (error) { Alert.alert('Request unavailable', getErrorMessage(error)); setScanned(false); }
  }

  if (mode === 'scan') {
    if (!permission?.granted) return <View style={styles.center}><Text style={styles.permissionText}>{permission?.canAskAgain === false ? 'Camera access is disabled. Enable it in your device settings to scan payment codes.' : 'Camera permission is required to scan payment codes.'}</Text>{permission?.canAskAgain !== false && <TouchableOpacity style={styles.primary} onPress={requestPermission}><Text style={styles.white}>Allow camera</Text></TouchableOpacity>}<TouchableOpacity style={styles.back} onPress={() => setMode('menu')}><Text>Back</Text></TouchableOpacity></View>;
    return <View style={styles.container}><CameraView style={styles.camera} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={scan} /><TouchableOpacity style={styles.back} onPress={() => setMode('menu')}><Text>Cancel scan</Text></TouchableOpacity></View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>QR payments</Text>
        {payload ? <View style={styles.qr}><QRCode value={payload} size={220} /><Text style={styles.meta}>Scan to pay {formatMoney(amount)}</Text><TouchableOpacity style={styles.linkButton} onPress={() => { setPayload(''); setAmount(''); setNote(''); }}><Text style={styles.secondaryText}>Create another request</Text></TouchableOpacity></View> : <>
          <TextInput style={styles.input} placeholder="Amount to request" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
          <TextInput style={styles.input} placeholder="Note" value={note} onChangeText={setNote} />
          <TouchableOpacity style={[styles.primary, busy && styles.disabled]} disabled={busy} onPress={generate}><Text style={styles.white}>{busy ? 'Generating…' : 'Generate request QR'}</Text></TouchableOpacity>
        </>}
        <TouchableOpacity style={styles.secondary} onPress={() => { setScanned(false); setMode('scan'); }}><Text style={styles.secondaryText}>Scan payment QR</Text></TouchableOpacity>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Text>Back</Text></TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24, backgroundColor: colors.background }, content: { flex: 1, padding: 24, gap: 14 },
  title: { fontSize: 26, fontWeight: '800', color: colors.primaryDark }, input: commonStyles.input,
  primary: commonStyles.primaryButton, disabled: { backgroundColor: colors.disabled }, secondary: { minHeight: 48, justifyContent: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 22, padding: 15, alignItems: 'center' },
  white: commonStyles.primaryButtonText, secondaryText: { color: colors.primaryDark, fontWeight: '700' }, qr: { alignItems: 'center', gap: 12, marginVertical: 20 }, meta: { color: colors.textMuted }, permissionText: { color: colors.text, textAlign: 'center', lineHeight: 21 }, linkButton: { minHeight: 48, justifyContent: 'center' },
  camera: { flex: 1 }, back: { alignItems: 'center', padding: 18 },
});
