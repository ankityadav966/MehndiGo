import React, { useEffect } from "react";
import { View, Animated, StyleSheet } from "react-native";

/**
 * Modern Shimmer Loading Skeleton Component (Airbnb/Zomato style)
 */
export function SkeletonItem({ width = "100%", height = 20, borderRadius = 8, style }) {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.cardContainer}>
      <SkeletonItem width="100%" height={160} borderRadius={16} />
      <View style={styles.cardBody}>
        <SkeletonItem width="70%" height={18} borderRadius={4} style={{ marginBottom: 8 }} />
        <SkeletonItem width="40%" height={14} borderRadius={4} style={{ marginBottom: 12 }} />
        <View style={styles.row}>
          <SkeletonItem width="30%" height={24} borderRadius={6} />
          <SkeletonItem width="35%" height={32} borderRadius={8} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonList({ count = 3 }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
}

export function SkeletonGrid({ count = 6, columns = 2 }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={{ width: `${100 / columns - 3}%`, marginBottom: 16 }}>
          <SkeletonItem width="100%" height={140} borderRadius={16} />
          <SkeletonItem width="70%" height={16} borderRadius={4} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}


const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "#E5E7EB",
  },
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  cardBody: {
    marginTop: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});

export default SkeletonList;

