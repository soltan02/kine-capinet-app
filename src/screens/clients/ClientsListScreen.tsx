import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useClientsStore } from '../../lib/store';
import { Client } from '../../lib/supabase';
import { Colors, FontSize, Spacing, BorderRadius, Shadow, CommonStyles, TAB_BAR_CLEARANCE } from '../../constants/theme';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';
import { SkeletonList } from '../../components/Skeleton';
import { useHover } from '../../hooks/useHover';

function ClientListItem({ client, onPress, selected }: { client: Client; onPress: () => void; selected?: boolean }) {
  const initials = `${client.first_name[0]}${client.last_name[0]}`.toUpperCase();
  const avatarColor = getAvatarColor(client.id);
  const { hovered, hoverProps } = useHover();

  return (
    <TouchableOpacity
      style={[
        styles.clientCard,
        selected && styles.clientCardSelected,
        !selected && hovered && styles.clientCardHovered,
        Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      {...hoverProps}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColor + '22' }]}>
        <Text style={[styles.avatarText, { color: avatarColor }]}>{initials}</Text>
      </View>
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{client.first_name} {client.last_name}</Text>
        {client.diagnosis ? (
          <Text style={styles.clientDiagnosis} numberOfLines={1}>{client.diagnosis}</Text>
        ) : null}
        {client.phone ? (
          <View style={styles.phoneRow}>
            <Ionicons name="call-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.clientPhone}>{client.phone}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.rightSection}>
        {client.cnam_number ? (
          <View style={styles.cnamBadge}>
            <Text style={styles.cnamBadgeText}>CNAM</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

function getAvatarColor(id: string): string {
  // Teal-family palette (Emerald Clinic)
  const colors = [Colors.primary, Colors.accent, Colors.info, Colors.success, Colors.secondary, Colors.cardPayment];
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

interface ClientsListScreenProps {
  navigation: any;
  // Desktop split-view mode (ClientsSplitScreen): when provided, tapping a
  // row calls this instead of navigation.navigate('ClientDetail', ...), and
  // selectedClientId highlights the active row. Mobile passes neither —
  // behavior there is completely unchanged.
  onSelectClient?: (client: Client) => void;
  selectedClientId?: string | null;
}

export default function ClientsListScreen({ navigation, onSelectClient, selectedClientId }: ClientsListScreenProps) {
  const { t } = useTranslation();
  const { clients, loading, error, fetchClients } = useClientsStore();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClients();
    setRefreshing(false);
  };

  const filtered = clients.filter((c) =>
    `${c.first_name} ${c.last_name} ${c.phone || ''} ${c.diagnosis || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      <StatusBar barStyle={Colors.statusBarStyle} />

      <ScreenHeader
        title={t('clients.title')}
        subtitle={t('clients.patientsCount', { count: clients.length })}
        onBack={() => navigation.navigate('Dashboard')}
        actions={[{ icon: 'person-add-outline', onPress: () => navigation.navigate('AddClient'), accessibilityLabel: t('clients.addClient') }]}
      />

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('clients.searchPlaceholder')}
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <SkeletonList count={7} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ClientListItem
              client={item}
              selected={!!onSelectClient && item.id === selectedClientId}
              onPress={() => (onSelectClient ? onSelectClient(item) : navigation.navigate('ClientDetail', { client: item }))}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListEmptyComponent={<EmptyState icon="people-outline" message={t('clients.noClients')} iconSize={64} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.dangerLight,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  errorBannerText: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 46,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: TAB_BAR_CLEARANCE,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...Shadow.sm,
  },
  clientCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  clientCardHovered: {
    backgroundColor: Colors.inputBg,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  clientDiagnosis: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  clientPhone: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  cnamBadge: {
    backgroundColor: Colors.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cnamBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.accent,
  },
});
