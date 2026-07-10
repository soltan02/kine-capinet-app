import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';
import { Client } from '../../lib/supabase';
import ClientsListScreen from './ClientsListScreen';
import ClientDetailScreen from './ClientDetailScreen';
import EmptyState from '../../components/EmptyState';
import { useTranslation } from 'react-i18next';

const LIST_COLUMN_WIDTH = 380;

// Desktop-only presentation of the Clients tab: list and detail side by
// side instead of the mobile push-navigation flow. Selection is local
// state here, not a stack push, so both panels stay mounted together.
// Wired in from MainNavigator's ClientsStack in place of ClientsListScreen
// when isDesktop — mobile's navigate('ClientDetail', ...) flow in
// ClientsListScreen itself is untouched (this screen opts into the
// alternate onSelectClient prop instead).
export default function ClientsSplitScreen({ navigation }: { navigation: any }) {
  const { t } = useTranslation();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // ClientDetailScreen calls navigation.goBack() for its header's back
  // button, which on a real stack would pop this whole screen — here it
  // should just clear the selection instead, so the detail panel closes
  // but the split view (and the list) stays. Everything else (navigate,
  // addListener) passes through to the real navigation object unchanged.
  const detailNavigation = { ...navigation, goBack: () => setSelectedClient(null) };

  return (
    <View style={styles.row}>
      <View style={styles.listColumn}>
        <ClientsListScreen
          navigation={navigation}
          onSelectClient={setSelectedClient}
          selectedClientId={selectedClient?.id ?? null}
        />
      </View>
      <View style={styles.detailColumn}>
        {selectedClient ? (
          <ClientDetailScreen navigation={detailNavigation} route={{ params: { client: selectedClient } }} />
        ) : (
          <View style={styles.emptyWrap}>
            <EmptyState icon="person-outline" message={t('clients.selectClientPrompt')} iconSize={56} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  listColumn: {
    width: LIST_COLUMN_WIDTH,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  detailColumn: {
    flex: 1,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
