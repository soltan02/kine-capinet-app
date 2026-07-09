import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, CommonStyles } from '../../constants/theme';
import type { UserRole } from '../../lib/supabase';

const { width } = Dimensions.get('window');

const ROLE_SLIDES: Record<UserRole, { icon: string; titleKey: string; bodyKey: string }[]> = {
  admin: [
    { icon: 'people-outline', titleKey: 'onboarding.admin.team.title', bodyKey: 'onboarding.admin.team.body' },
    { icon: 'person-add-outline', titleKey: 'onboarding.admin.patients.title', bodyKey: 'onboarding.admin.patients.body' },
    { icon: 'cloud-upload-outline', titleKey: 'onboarding.admin.backups.title', bodyKey: 'onboarding.admin.backups.body' },
  ],
  therapist: [
    { icon: 'medkit-outline', titleKey: 'onboarding.therapist.records.title', bodyKey: 'onboarding.therapist.records.body' },
    { icon: 'document-text-outline', titleKey: 'onboarding.therapist.notes.title', bodyKey: 'onboarding.therapist.notes.body' },
    { icon: 'sparkles-outline', titleKey: 'onboarding.therapist.ai.title', bodyKey: 'onboarding.therapist.ai.body' },
  ],
  receptionist: [
    { icon: 'calendar-outline', titleKey: 'onboarding.receptionist.appointments.title', bodyKey: 'onboarding.receptionist.appointments.body' },
    { icon: 'cash-outline', titleKey: 'onboarding.receptionist.billing.title', bodyKey: 'onboarding.receptionist.billing.body' },
  ],
};

export default function OnboardingScreen({ role, onDone }: { role: UserRole; onDone: () => void }) {
  const { t } = useTranslation();
  const slides = ROLE_SLIDES[role] || ROLE_SLIDES.receptionist;
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isLast = index === slides.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  const goNext = () => {
    if (isLast) { onDone(); return; }
    scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
    setIndex(index + 1);
  };

  return (
    <SafeAreaView style={[CommonStyles.safeArea, { backgroundColor: Colors.primary }]} edges={['top', 'bottom']}>
      <TouchableOpacity style={styles.skip} onPress={onDone}>
        <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
      </TouchableOpacity>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
      >
        {slides.map((slide, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={styles.iconWrap}>
              <Ionicons name={slide.icon as any} size={56} color={Colors.white} />
            </View>
            <Text style={styles.title}>{t(slide.titleKey)}</Text>
            <Text style={styles.body}>{t(slide.bodyKey)}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <TouchableOpacity style={styles.nextBtn} onPress={goNext} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>{isLast ? t('onboarding.getStarted') : t('onboarding.next')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  skip: {
    alignSelf: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  skipText: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    fontSize: FontSize.sm,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  iconWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  body: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    backgroundColor: Colors.white,
    width: 20,
  },
  nextBtn: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  nextBtnText: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: FontSize.md,
  },
});
