import React, { useRef, useEffect } from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import Colors from "../constants/Colors";

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>MehendiGo Tracking</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { padding: 0; margin: 0; background-color: #f7f7f9; }
    html, body, #map { height: 100%; width: 100vw; }
    .leaflet-bar { border: none !important; box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important; }
    .leaflet-bar a { background-color: #ffffff !important; color: #1e293b !important; border-bottom: 1px solid #f1f5f9 !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { 
      zoomControl: false, 
      attributionControl: false 
    }).setView([26.9124, 75.7873], 13);

    // Render Official Google Maps Tiles
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    var customerMarker = null;
    var artistMarker = null;
    var pathPolyline = null;
    var didFitBounds = false;

    // Custom Blue Pin for Customer
    var customerIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Custom Red Pin for Artist
    var artistIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Animates the artist marker smoothly by interpolating coordinates
    function animateMarker(marker, targetLat, targetLng, duration) {
      var startLat = marker.getLatLng().lat;
      var startLng = marker.getLatLng().lng;
      var startTime = performance.now();

      function step(now) {
        var elapsed = now - startTime;
        var progress = Math.min(elapsed / duration, 1);

        // Ease-out quad interpolation
        var easeProgress = progress * (2 - progress);

        var currentLat = startLat + (targetLat - startLat) * easeProgress;
        var currentLng = startLng + (targetLng - startLng) * easeProgress;

        marker.setLatLng([currentLat, currentLng]);

        if (progress < 1) {
          requestAnimationFrame(step);
        }
      }

      requestAnimationFrame(step);
    }

    // Listens for coordinate updates from the React Native application
    window.addEventListener('message', function(event) {
      try {
        const payload = JSON.parse(event.data);
        const { customer, artist } = payload;

        if (customer) {
          if (!customerMarker) {
            customerMarker = L.marker([customer.lat, customer.lng], { icon: customerIcon }).addTo(map).bindPopup('<b>Your Location</b>');
          } else {
            customerMarker.setLatLng([customer.lat, customer.lng]);
          }
        }

        if (artist) {
          if (!artistMarker) {
            artistMarker = L.marker([artist.lat, artist.lng], { icon: artistIcon }).addTo(map).bindPopup('<b>Artist Location</b>');
            map.setView([artist.lat, artist.lng], 15);
          } else {
            animateMarker(artistMarker, artist.lat, artist.lng, 3500);
            map.panTo([artist.lat, artist.lng]);
          }
        }

        if (customer && artist) {
          var url = 'https://router.project-osrm.org/route/v1/driving/' + artist.lng + ',' + artist.lat + ';' + customer.lng + ',' + customer.lat + '?overview=full&geometries=geojson';
          fetch(url)
            .then(function(r) { return r.json(); })
            .then(function(data) {
              if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const routeCoords = route.geometry.coordinates.map(function(c) {
                  return [c[1], c[0]];
                });

                if (!pathPolyline) {
                  pathPolyline = L.polyline(routeCoords, {
                    color: '#1A73E8',
                    weight: 6,
                    opacity: 0.85
                  }).addTo(map);
                } else {
                  pathPolyline.setLatLngs(routeCoords);
                }

                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'ROUTE_INFO',
                  distance: route.distance / 1000,
                  duration: route.duration / 60
                }));

                setTimeout(function() {
                  map.invalidateSize();
                  if (pathPolyline) {
                    map.fitBounds(pathPolyline.getBounds().pad(0.2));
                  } else if (customerMarker && artistMarker) {
                    const group = new L.featureGroup([customerMarker, artistMarker]);
                    map.fitBounds(group.getBounds().pad(0.2));
                  }
                }, 200);
              }
            })
            .catch(function(err) {
              console.warn("OSRM routing failed, drawing straight line fallback:", err);
              const fallbackLatLngs = [
                [customer.lat, customer.lng],
                [artist.lat, artist.lng]
              ];
              if (!pathPolyline) {
                pathPolyline = L.polyline(fallbackLatLngs, {
                  color: '#1A73E8',
                  weight: 6,
                  opacity: 0.85,
                  dashArray: '5, 5'
                }).addTo(map);
              } else {
                pathPolyline.setLatLngs(fallbackLatLngs);
              }
              setTimeout(function() {
                map.invalidateSize();
                if (customerMarker && artistMarker) {
                  const group = new L.featureGroup([customerMarker, artistMarker]);
                  map.fitBounds(group.getBounds().pad(0.2));
                }
              }, 200);
            });
        }
      } catch (err) {
        console.error("[LeafletWebView] Error rendering:", err);
      }
    });

    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
  </script>
</body>
</html>
`;

export default function LeafletMapView({ customerCoords, artistCoords, onRouteUpdate, style }) {
  const webviewRef = useRef(null);

  // Propagate coords updates to WebView context
  useEffect(() => {
    if (webviewRef.current && customerCoords && artistCoords) {
      webviewRef.current.postMessage(
        JSON.stringify({
          customer: customerCoords,
          artist: artistCoords
        })
      );
    }
  }, [customerCoords, artistCoords]);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "MAP_READY" && customerCoords && artistCoords) {
        webviewRef.current.postMessage(
          JSON.stringify({
            customer: customerCoords,
            artist: artistCoords
          })
        );
      } else if (data.type === "ROUTE_INFO") {
        if (onRouteUpdate) {
          onRouteUpdate(data.distance, data.duration);
        }
      }
    } catch (e) {
      console.warn("[LeafletMapView] handleMessage error:", e);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ html: htmlContent }}
        style={styles.mapWebView}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.primary || "#FF4D6D"} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8
  },
  mapWebView: {
    flex: 1
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC"
  }
});
