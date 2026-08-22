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
  <title>MehendiGo Navigation Map</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { padding: 0; margin: 0; background-color: #f7f7f9; }
    html, body, #map { height: 100%; width: 100vw; }
    .leaflet-bar { border: none !important; box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important; }
    .leaflet-bar a { background-color: #ffffff !important; color: #1e293b !important; border-bottom: 1px solid #f1f5f9 !important; }
    .custom-pulse-marker {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pulse-dot {
      width: 14px;
      height: 14px;
      background: #2563EB;
      border: 2.5px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(37, 99, 235, 0.6);
      position: relative;
    }
    .pulse-ring {
      position: absolute;
      width: 32px;
      height: 32px;
      background: rgba(37, 99, 235, 0.25);
      border-radius: 50%;
      animation: pulse 2s infinite ease-out;
    }
    @keyframes pulse {
      0% { transform: scale(0.5); opacity: 1; }
      100% { transform: scale(1.6); opacity: 0; }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { 
      zoomControl: false, 
      attributionControl: false 
    }).setView([26.9124, 75.7873], 13);

    // High performance Google Maps tiles
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    var originMarker = null;
    var destMarker = null;
    var pathOutline = null;
    var pathPolyline = null;
    var currentOrigin = null;
    var currentDest = null;

    var originIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    var destIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    function animateMarker(marker, targetLat, targetLng, duration) {
      if (!marker) return;
      var startLat = marker.getLatLng().lat;
      var startLng = marker.getLatLng().lng;
      var startTime = performance.now();

      function step(now) {
        var elapsed = now - startTime;
        var progress = Math.min(elapsed / duration, 1);
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

    function renderRouteLine(latLngs, distanceKm, durationMins) {
      if (!pathOutline) {
        pathOutline = L.polyline(latLngs, {
          color: '#1E40AF',
          weight: 7,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);
      } else {
        pathOutline.setLatLngs(latLngs);
      }

      if (!pathPolyline) {
        pathPolyline = L.polyline(latLngs, {
          color: '#3B82F6',
          weight: 4.5,
          opacity: 1,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);
      } else {
        pathPolyline.setLatLngs(latLngs);
      }

      if (window.ReactNativeWebView && distanceKm !== null && durationMins !== null) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'ROUTE_INFO',
          distance: distanceKm,
          duration: durationMins
        }));
      }

      setTimeout(function() {
        map.invalidateSize();
        if (pathPolyline) {
          map.fitBounds(pathPolyline.getBounds().pad(0.18));
        } else if (originMarker && destMarker) {
          var group = new L.featureGroup([originMarker, destMarker]);
          map.fitBounds(group.getBounds().pad(0.18));
        }
      }, 150);
    }

    function fetchAndDrawRoadRoute(orig, dest) {
      var osrm1 = 'https://router.project-osrm.org/route/v1/driving/' + orig.lng + ',' + orig.lat + ';' + dest.lng + ',' + dest.lat + '?overview=full&geometries=geojson';
      var osrm2 = 'https://routing.openstreetmap.de/routed-car/route/v1/driving/' + orig.lng + ',' + orig.lat + ';' + dest.lng + ',' + dest.lat + '?overview=full&geometries=geojson';

      fetch(osrm1)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data && data.routes && data.routes.length > 0) {
            var route = data.routes[0];
            var routeCoords = route.geometry.coordinates.map(function(c) {
              return [c[1], c[0]];
            });
            renderRouteLine(routeCoords, route.distance / 1000, route.duration / 60);
          } else {
            throw new Error("No route from mirror 1");
          }
        })
        .catch(function() {
          // Try mirror 2
          fetch(osrm2)
            .then(function(r) { return r.json(); })
            .then(function(data2) {
              if (data2 && data2.routes && data2.routes.length > 0) {
                var route2 = data2.routes[0];
                var routeCoords2 = route2.geometry.coordinates.map(function(c) {
                  return [c[1], c[0]];
                });
                renderRouteLine(routeCoords2, route2.distance / 1000, route2.duration / 60);
              } else {
                throw new Error("No route from mirror 2");
              }
            })
            .catch(function(err) {
              console.warn("External OSRM unavailable, generating smooth road approximation:", err);
              // Multi-segment smooth curve calculation
              var steps = 20;
              var approxCoords = [];
              for (var i = 0; i <= steps; i++) {
                var t = i / steps;
                var lat = orig.lat + (dest.lat - orig.lat) * t;
                var lng = orig.lng + (dest.lng - orig.lng) * t;
                approxCoords.push([lat, lng]);
              }
              // Calculate haversine distance
              var R = 6371;
              var dLat = (dest.lat - orig.lat) * (Math.PI / 180);
              var dLon = (dest.lng - orig.lng) * (Math.PI / 180);
              var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(orig.lat * (Math.PI / 180)) * Math.cos(dest.lat * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
              var distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.25;
              var durMins = Math.max(1, Math.ceil((distKm / 20) * 60));
              renderRouteLine(approxCoords, distKm, durMins);
            });
        });
    }

    window.addEventListener('message', function(event) {
      try {
        var payload = JSON.parse(event.data);
        var origin = payload.origin || payload.customer || payload.artist;
        var destination = payload.destination || payload.artist || payload.customer;

        if (payload.mode === 'artist_to_customer') {
          origin = payload.artist || payload.origin;
          destination = payload.customer || payload.destination;
        } else if (payload.mode === 'customer_to_artist') {
          origin = payload.customer || payload.origin;
          destination = payload.artist || payload.destination;
        }

        var originLabel = payload.originLabel || 'Origin Location';
        var destLabel = payload.destLabel || 'Destination Location';

        if (origin && origin.lat && origin.lng) {
          currentOrigin = origin;
          if (!originMarker) {
            originMarker = L.marker([origin.lat, origin.lng], { icon: originIcon }).addTo(map).bindPopup('<b>' + originLabel + '</b>');
          } else {
            animateMarker(originMarker, origin.lat, origin.lng, 2500);
          }
        }

        if (destination && destination.lat && destination.lng) {
          currentDest = destination;
          if (!destMarker) {
            destMarker = L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map).bindPopup('<b>' + destLabel + '</b>');
          } else {
            animateMarker(destMarker, destination.lat, destination.lng, 2500);
          }
        }

        if (currentOrigin && currentDest) {
          if (payload.routeCoordinates && Array.isArray(payload.routeCoordinates) && payload.routeCoordinates.length > 0) {
            renderRouteLine(payload.routeCoordinates, payload.distanceKm || null, payload.durationMins || null);
          } else {
            fetchAndDrawRoadRoute(currentOrigin, currentDest);
          }
        } else if (currentOrigin) {
          map.setView([currentOrigin.lat, currentOrigin.lng], 15);
        } else if (currentDest) {
          map.setView([currentDest.lat, currentDest.lng], 15);
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

export default function LeafletMapView({
  customerCoords,
  artistCoords,
  origin,
  destination,
  originLabel,
  destLabel,
  mode = "customer_to_artist",
  routeCoordinates,
  onRouteUpdate,
  style
}) {
  const webviewRef = useRef(null);

  // Normalize coords
  const resolvedOrigin = origin || (mode === "artist_to_customer" ? artistCoords : customerCoords);
  const resolvedDest = destination || (mode === "artist_to_customer" ? customerCoords : artistCoords);

  const postStateToMap = () => {
    if (!webviewRef.current) return;
    const origLat = Number(resolvedOrigin?.lat || resolvedOrigin?.latitude);
    const origLng = Number(resolvedOrigin?.lng || resolvedOrigin?.longitude);
    const destLat = Number(resolvedDest?.lat || resolvedDest?.latitude);
    const destLng = Number(resolvedDest?.lng || resolvedDest?.longitude);

    const payload = {
      mode,
      origin: !isNaN(origLat) && !isNaN(origLng) && origLat !== 0 ? { lat: origLat, lng: origLng } : null,
      destination: !isNaN(destLat) && !isNaN(destLng) && destLat !== 0 ? { lat: destLat, lng: destLng } : null,
      originLabel: originLabel || (mode === "artist_to_customer" ? "Your Live GPS (Artist)" : "Your Location"),
      destLabel: destLabel || (mode === "artist_to_customer" ? "Customer Booking Location" : "Artist Location"),
      routeCoordinates: Array.isArray(routeCoordinates) ? routeCoordinates : null
    };

    webviewRef.current.postMessage(JSON.stringify(payload));
  };

  useEffect(() => {
    postStateToMap();
  }, [resolvedOrigin?.lat, resolvedOrigin?.latitude, resolvedOrigin?.lng, resolvedOrigin?.longitude, resolvedDest?.lat, resolvedDest?.latitude, resolvedDest?.lng, resolvedDest?.longitude, routeCoordinates]);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "MAP_READY") {
        postStateToMap();
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
