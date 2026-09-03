import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { getNormalizedUrl } from "../../services/api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function resolveMediaUrl(url) {
  if (!url || typeof url !== "string") return "";
  let trimmed = url.trim();

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("file://") ||
    trimmed.startsWith("content://")
  ) {
    return trimmed;
  }
  return getNormalizedUrl(trimmed);
}

function isImageExtension(url) {
  if (!url) return false;
  return /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(url) && !/\/video\/upload\//.test(url);
}

export default function VideoPlayerScreen({ route, navigation }) {
  const { videoUrl, title = "Video Viewer", posterUrl } = route.params || {};
  const [hasError, setHasError] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const finalMediaUrl = resolveMediaUrl(videoUrl);
  const finalPosterUrl = resolveMediaUrl(posterUrl);
  const isImage = isImageExtension(finalMediaUrl);

  // Initialize native expo-video player
  const player = useVideoPlayer(isImage ? null : finalMediaUrl, (p) => {
    p.loop = true;
    p.muted = false;
    p.showsPlaybackControls = true;
    try {
      p.play();
    } catch (_) {}
  });

  // Track playback status updates
  useEffect(() => {
    if (!player || isImage) return;

    const subscription = player.addListener("statusChange", (status) => {
      if (status?.status === "error") {
        setHasError(true);
      }
    });

    return () => {
      try {
        subscription.remove();
      } catch (_) {}
    };
  }, [player, isImage]);

  const togglePlayPause = () => {
    if (!player) return;
    if (player.playing) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!player) return;
    const newMuted = !isMuted;
    player.muted = newMuted;
    setIsMuted(newMuted);
  };

  const handleRetry = () => {
    setHasError(false);
    if (player && finalMediaUrl) {
      try {
        if (typeof player.replaceAsync === "function") {
          player.replaceAsync(finalMediaUrl);
        } else if (typeof player.replace === "function") {
          player.replace(finalMediaUrl);
        }
        player.play();
      } catch (_) {}
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>

        {!isImage && player ? (
          <TouchableOpacity
            style={styles.muteBtn}
            onPress={toggleMute}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons
              name={isMuted ? "volume-mute" : "volume-high"}
              size={22}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Main Player / Image Canvas */}
      <View style={styles.mediaCanvas}>
        {isImage ? (
          <Image
            source={{ uri: finalMediaUrl }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.videoWrapper}>
            {finalPosterUrl ? (
              <Image
                source={{ uri: finalPosterUrl }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
            ) : null}

            {player && !hasError ? (
              <VideoView
                style={styles.videoSurface}
                player={player}
                allowsFullscreen={true}
                showsPlaybackControls={true}
                contentFit="contain"
              />
            ) : null}

            {/* Error Overlay */}
            {hasError && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
                <Text style={styles.errorTitle}>Unable to play video</Text>
                <Text style={styles.errorText}>Please check your network connection or try again.</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
                  <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.retryBtnText}>Retry Playback</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.8)",
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginHorizontal: 12,
  },
  muteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  mediaCanvas: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#050505",
  },
  videoWrapper: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  videoSurface: {
    width: "100%",
    height: "100%",
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  errorContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.9)",
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 12,
  },
  errorText: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary || "#9C1344",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 20,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
