import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Colors from "../constants/Colors";

function Shimmer({ style }) {
  const [opacity] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.shimmer, { opacity }, style]} />
  );
}

export function SkeletonLine({ width = "100%", height = 14, style }) {
  return <Shimmer style={{ width, height, borderRadius: 6, ...style }} />;
}

export function SkeletonCircle({ size = 48, style }) {
  return <Shimmer style={{ width: size, height: size, borderRadius: size / 2, ...style }} />;
}

export function SkeletonCard({ style }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardRow}>
        <SkeletonCircle size={44} />
        <View style={styles.cardLines}>
          <SkeletonLine width="60%" height={14} />
          <SkeletonLine width="40%" height={10} style={{ marginTop: 8 }} />
        </View>
      </View>
      <SkeletonLine width="100%" height={10} style={{ marginTop: 12 }} />
      <SkeletonLine width="80%" height={10} style={{ marginTop: 6 }} />
    </View>
  );
}

export function SkeletonGrid({ count = 4, columns = 2 }) {
  const items = Array.from({ length: count });
  return (
    <View style={styles.grid}>
      {items.map((_, i) => (
        <View key={i} style={[styles.gridItem, { width: `${100 / columns - 4}%` }]}>
          <Shimmer style={{ width: "100%", height: 160, borderRadius: 14 }} />
          <SkeletonLine width="70%" height={12} style={{ marginTop: 10 }} />
          <SkeletonLine width="50%" height={10} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonList({ count = 4 }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} style={{ marginBottom: 12 }} />
      ))}
    </View>
  );
}

export default function LoadingSkeleton({ type = "list", count, columns, style }) {
  if (type === "grid") return <SkeletonGrid count={count} columns={columns} />;
  if (type === "card") return <SkeletonCard />;
  if (type === "list") return <SkeletonList count={count} />;
  return <SkeletonList count={count || 4} />;
}

const styles = StyleSheet.create({
  shimmer: {
    backgroundColor: Colors.border,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardLines: {
    flex: 1,
    marginLeft: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  gridItem: {
    marginBottom: 16,
  },
  list: {
    paddingVertical: 12,
  },
});
