import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, CommonStyles } from '../../constants/theme';
import { parseSetupCode, testSetupCode, saveClinicConfig } from '../../lib/clinicConfig';
import TextField from '../../components/TextField';
import Button from '../../components/Button';
import InlineBanner from '../../components/InlineBanner';

export default function ClinicSetupScreen({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState('');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    setError(null);
    const parsed = parseSetupCode(code);
    if (!parsed) {
      setError("Code de configuration invalide. Vérifiez qu'il a bien été copié en entier.");
      return;
    }
    setTesting(true);
    const result = await testSetupCode(parsed.url, parsed.anonKey);
    setTesting(false);
    if (!result.ok) {
      setError(
        result.error === 'invalid_key'
          ? 'Ce code ne correspond à aucun cabinet valide.'
          : 'Impossible de se connecter. Vérifiez votre connexion internet et le code.'
      );
      return;
    }
    await saveClinicConfig(parsed.url, parsed.anonKey);
    onDone();
  };

  return (
    <SafeAreaView style={[CommonStyles.safeArea, { backgroundColor: Colors.primary }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.iconWrap}>
            <Ionicons name="business-outline" size={48} color={Colors.white} />
          </View>
          <Text style={styles.title}>Configuration du cabinet</Text>
          <Text style={styles.subtitle}>
            Collez le code de configuration fourni par votre prestataire pour connecter l'application aux données de votre cabinet.
          </Text>

          <View style={styles.card}>
            <TextField
              label="Code de configuration"
              value={code}
              onChangeText={setCode}
              placeholder="https://votre-cabinet.supabase.co::eyJ..."
              multiline
              autoCapitalize="none"
              autoCorrect={false}
            />
            {error ? <InlineBanner type="error" message={error} /> : null}

            <Button
              title="Connecter mon cabinet"
              onPress={handleContinue}
              loading={testing}
              disabled={!code.trim()}
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  iconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
});
