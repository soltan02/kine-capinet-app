import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadow } from '../constants/theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/** A single shimmering placeholder block. */
export function Skeleton({ width = '100%', height = 14, borderRadius = 6, style }: SkeletonProps) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: Colors.borderLight, opacity: pulse },
        style,
      ]}
    />
  );
}

/** A list-row skeleton (avatar + two lines), matching the card list layout. */
export function SkeletonListCard() {
  return (
    <View style={styles.card}>
      <Skeleton width={44} height={44} borderRadius={12} />
      <View style={styles.lines}>
        <Skeleton width="60%" height={13} />
        <Skeleton width="40%" height={11} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

/** Renders `count` list-row skeletons. Set `padded={false}` when the parent
 *  already provides horizontal padding, to avoid doubling it. */
export function SkeletonList({ count = 6, padded = true }: { count?: number; padded?: boolean }) {
  return (
    <View style={padded ? styles.list : styles.listFlush}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  listFlush: {
    paddingTop: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  lines: {
    flex: 1,
  },
});
