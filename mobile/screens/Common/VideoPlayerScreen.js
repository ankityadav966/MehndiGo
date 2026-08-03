import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { getNormalizedUrl } from "../../services/api";

function resolveVideoUrl(url) {
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

export default function VideoPlayerScreen({ route, navigation }) {
  const { videoUrl, title = "Media Viewer" } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isImageMedia, setIsImageMedia] = useState(false);

  const finalVideoUrl = resolveVideoUrl(videoUrl);

  useEffect(() => {
    console.log("[PLAYER CREATED]", { title });
    console.log("[SOURCE ASSIGNED]", { rawInput: videoUrl, finalResolvedUrl: finalVideoUrl });

    // Synchronous extension check
    if (/\.(jpg|jpeg|png|webp)$/i.test(finalVideoUrl)) {
      console.log("[MEDIA TYPE DETECTED] File extension is image, switching to ImageViewer mode.");
      setIsImageMedia(true);
      setLoading(false);
      return;
    }

    if (finalVideoUrl.startsWith("http://") || finalVideoUrl.startsWith("https://")) {
      fetch(finalVideoUrl, { method: "HEAD" })
        .then((res) => {
          const contentType = res.headers.get("content-type") || "";
          console.log("[URL HEAD CHECK]", {
            status: res.status,
            ok: res.ok,
            contentType,
            contentLength: res.headers.get("content-length"),
            acceptRanges: res.headers.get("accept-ranges")
          });

          if (contentType.startsWith("image/")) {
            console.log("[MEDIA TYPE DETECTED] Item is a Photo Image, switching to ImageViewer mode.");
            setIsImageMedia(true);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("[URL HEAD CHECK ERROR]", err.message);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [videoUrl, finalVideoUrl, title]);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background-color: #000000;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
          }
          video {
            width: 100%;
            height: 100%;
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }
        </style>
      </head>
      <body>
        <video
          id="video-player"
          controls
          autoplay
          playsinline
          loop
          webkit-playsinline
          src="${finalVideoUrl}"
        >
          <source src="${finalVideoUrl}" />
          Your browser does not support video playback.
        </video>
        <script>
          const v = document.getElementById('video-player');
          window.ReactNativeWebView = window.ReactNativeWebView || {};
          
          v.addEventListener('loadstart', function() {
            window.ReactNativeWebView.postMessage && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOADING_STARTED' }));
          });
          v.addEventListener('canplay', function() {
            window.ReactNativeWebView.postMessage && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'VIDEO_READY' }));
          });
          v.addEventListener('playing', function() {
            window.ReactNativeWebView.postMessage && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PLAYBACK_STARTED' }));
          });
          v.addEventListener('error', function(e) {
            window.ReactNativeWebView.postMessage && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PLAYBACK_ERROR', error: v.error ? v.error.message : 'Unknown' }));
          });

          v.play().catch(function(err) {
            console.log('Autoplay deferred:', err);
          });
        </script>
      </body>
    </html>
  `;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header bar overlay */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.playerWrapper}>
        {loading ? (
          <View style={styles.indicatorContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : isImageMedia ? (
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: finalVideoUrl }}
              style={styles.imageMedia}
              resizeMode="contain"
            />
            <View style={styles.imageNoteBanner}>
              <Ionicons name="image-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.imageNoteText}>Photo Portfolio Item</Text>
            </View>
          </View>
        ) : hasError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
            <Text style={styles.errorText}>Unable to load video playback.</Text>
            <Text style={styles.errorSubText}>{finalVideoUrl}</Text>
          </View>
        ) : (
          <WebView
            originWhitelist={["*"]}
            source={{ html: htmlContent, baseUrl: finalVideoUrl }}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsFullscreenVideo={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            mixedContentMode="always"
            allowFileAccess={true}
            allowUniversalAccessFromFileURLs={true}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                console.log("[VIDEO PLAYER EVENT]", data);
                if (data.type === "PLAYBACK_ERROR") {
                  console.error("[PLAYBACK ERROR]", data.error);
                }
              } catch (e) {}
            }}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error("[PLAYBACK ERROR]", nativeEvent);
              setHasError(true);
            }}
          />
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
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 10,
    backgroundColor: "#000000",
    borderBottomWidth: 1,
    borderColor: "#222",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
    marginHorizontal: 12,
  },
  playerWrapper: {
    flex: 1,
    position: "relative",
    width: "100%",
    height: "100%",
  },
  webView: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#000000",
  },
  imageWrapper: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
    position: "relative",
  },
  imageMedia: {
    width: "100%",
    height: "100%",
  },
  imageNoteBanner: {
    position: "absolute",
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  imageNoteText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  indicatorContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#000000",
  },
  errorText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  errorSubText: {
    color: "#888888",
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
  },
});
