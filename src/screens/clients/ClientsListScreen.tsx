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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useClientsStore } from '../../lib/store';
import { Client } from '../../lib/supabase';
import { Colors, FontSize, Spacing, BorderRadius, Shadow, CommonStyles } from '../../constants/theme';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';
import { SkeletonList } from '../../components/Skeleton';

function ClientListItem({ client, onPress }: { client: Client; onPress: () => void }) {
  const { t } = useTranslation();
  const initials = `${client.first_name[0]}${client.last_name[0]}`.toUpperCase();
  const avatarColor = getAvatarColor(client.id);

  return (
    <TouchableOpacity style={styles.clientCard} onPress={onPress} activeOpacity={0.85}>
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
        {!client.is_active ? (
          <View style={styles.inactiveBadge}>
            <Text style={styles.inactiveBadgeText}>{t('clients.inactive')}</Text>
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

export default function ClientsListScreen({ navigation }: { navigation: any }) {
  const { t } = useTranslation();
  const { clients, loading, error, fetchClients } = useClientsStore();
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClients();
    setRefreshing(false);
  };

  const filtered = clients.filter((c) => {
    const matchesSearch = `${c.first_name} ${c.last_name} ${c.phone || ''} ${c.diagnosis || ''}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesActive = activeOnly ? c.is_active : true;
    return matchesSearch && matchesActive;
  });

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      <StatusBar barStyle={Colors.statusBarStyle} />

      <ScreenHeader
        title={t('clients.title')}
        subtitle={`${clients.filter(c => c.is_active).length} ${t('clients.activeClients')}`}
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
        <TouchableOpacity
          style={[styles.filterChip, activeOnly && styles.filterChipActive]}
          onPress={() => setActiveOnly(!activeOnly)}
        >
          <Text style={[styles.filterChipText, activeOnly && styles.filterChipTextActive]}>
            {activeOnly ? t('clients.activeClients') : t('common.all')}
          </Text>
        </TouchableOpacity>
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
              onPress={() => navigation.navigate('ClientDetail', { client: item })}
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
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent,
  },
  filterChipText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  filterChipTextActive: {
    color: Colors.primary,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
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
  inactiveBadge: {
    backgroundColor: Colors.dangerLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.danger,
  },
});
