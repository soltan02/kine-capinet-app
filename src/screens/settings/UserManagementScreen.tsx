import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { supabase, Profile, UserRole } from '../../lib/supabase';
import { Colors, FontSize, Spacing, BorderRadius, Shadow, CommonStyles, TAB_BAR_CLEARANCE } from '../../constants/theme';
import { isLocalModeEnabled, getAllLocalUsers, updateLocalUserRole, LocalUser } from '../../lib/localAuth';
import ScreenHeader from '../../components/ScreenHeader';
import { SkeletonList } from '../../components/Skeleton';

export default function UserManagementScreen({ navigation }: { navigation: any }) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<(Profile | LocalUser)[]>([]);
  const [loading, setLoading] = useState(true);
  const [localMode, setLocalMode] = useState(false);

  useEffect(() => {
    checkModeAndFetch();
  }, []);

  const checkModeAndFetch = async () => {
    const local = await isLocalModeEnabled();
    setLocalMode(local);
    fetchUsers(local);
  };

  const fetchUsers = async (local: boolean) => {
    setLoading(true);
    if (local) {
      const localUsers = await getAllLocalUsers();
      setUsers(localUsers);
    } else {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      setUsers((data as Profile[]) || []);
    }
    setLoading(false);
  };

  const handleRoleChange = async (user: Profile | LocalUser, newRole: UserRole) => {
    const userName = user.full_name;
    Alert.alert(
      t('settings.changeRole'),
      `${userName} → ${t(`settings.roles.${newRole}` as any)}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            if (localMode) {
              await updateLocalUserRole(user.id, newRole);
            } else {
              const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', user.id);
              if (error) {
                Alert.alert(t('common.error'), error.message);
                return;
              }
            }
            fetchUsers(localMode);
          },
        },
      ]
    );
  };

  const getFullName = (user: Profile | LocalUser) => user.full_name;

  const getUserRole = (user: Profile | LocalUser): UserRole => user.role as UserRole;

  const RoleBadge = ({ role }: { role: UserRole }) => {
    const isAdmin = role === 'admin';
    return (
      <View style={[styles.roleBadge, isAdmin && styles.roleBadgeAdmin]}>
        <Text style={[styles.roleBadgeText, isAdmin && styles.roleBadgeTextAdmin]}>
          {t(`settings.roles.${role}` as any)}
        </Text>
      </View>
    );
  };
  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      <ScreenHeader
        title={t('settings.users')}
        onBack={() => navigation.goBack()}
        actions={[{ icon: 'add', onPress: () => navigation.navigate('AddUser'), accessibilityLabel: t('settings.addUser') }]}
      />

      {loading ? (
        <SkeletonList count={6} />
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {users.map((user) => (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {getFullName(user).split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{getFullName(user)}</Text>
                <RoleBadge role={getUserRole(user)} />
              </View>
              <TouchableOpacity
                style={styles.changeRoleBtn}
                onPress={() => {
                  const roles: UserRole[] = ['admin', 'therapist', 'receptionist'];
                  const currentIndex = roles.indexOf(getUserRole(user));
                  const nextRole = roles[(currentIndex + 1) % roles.length];
                  handleRoleChange(user, nextRole);
                }}
              >
                <Ionicons name="swap-horizontal-outline" size={18} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => navigation.navigate('EditUser', { user })}
              >
                <Ionicons name="pencil" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={{ height: TAB_BAR_CLEARANCE }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.lg },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  userAvatar: {
    width: 44,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.primary,
  },
  userInfo: { flex: 1 },
  userName: {
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  roleBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  roleBadgeAdmin: {
    backgroundColor: Colors.accent,
  },
  roleBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primary,
  },
  roleBadgeTextAdmin: {
    color: Colors.white,
  },
  changeRoleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
});
