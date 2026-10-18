import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import WebView, { type WebViewMessageEvent } from "react-native-webview";
import type {
  MapRegion,
  MerchantMapHandle,
  MerchantMapMarker,
  MerchantMapProps,
} from "./MerchantMap.types";

const DEFAULT_DELTA = 0.01;
const DEFAULT_PIN_COLOR = "#0f766e";
const DEFAULT_PIN_SIZE = 32;

type MapWebViewMessage =
  | { type: "ready" }
  | { type: "mapPress"; latitude: number; longitude: number }
  | { type: "markerPress"; index: number }
  | { type: "markerDragEnd"; index: number; latitude: number; longitude: number };

const deltaToZoom = (latitudeDelta: number): number => {
  const span = Math.max(latitudeDelta, 0.000001);
  return Math.min(Math.max(Math.log2(360 / span), 1), 19);
};

const serializeForScript = (value: unknown): string =>
  (JSON.stringify(value) ?? "null").replace(/</g, "\\u003c");

const createMapHtml = (
  mapTilerKey: string,
  initialRegion: MapRegion
): string => {
  const tileUrl = `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${encodeURIComponent(mapTilerKey)}`;
  const center = serializeForScript([
    initialRegion.latitude,
    initialRegion.longitude,
  ]);
  const zoom = deltaToZoom(initialRegion.latitudeDelta ?? DEFAULT_DELTA);
  const attribution = "© MapTiler © OpenStreetMap contributors";

  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
    <style>
      html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
      body { background: #f2f4f7; }
      .leaflet-container { background: #f2f4f7; }
      .locali-marker { border: 0; background: transparent; }
    </style>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  </head>
  <body>
    <div id="map"></div>
    <script>
      window.addEventListener("load", function () {
        window.map = L.map("map", { zoomControl: false }).setView(${center}, ${zoom});
        window.markerLayer = L.layerGroup().addTo(window.map);
        window.isInteractive = true;
        window.mapAttribution = ${serializeForScript(attribution)};
        window.tileLayer = L.tileLayer(${serializeForScript(tileUrl)}, {
          maxZoom: 20,
          attribution: window.mapAttribution
        }).addTo(window.map);
        window.zoomControl = L.control.zoom({ position: "topright" });
        window.setMapOptions = function (options) {
          window.isInteractive = options.interactive;
          var interactions = [
            [window.map.dragging, options.interactive && options.scrollEnabled],
            [window.map.keyboard, options.interactive && options.scrollEnabled],
            [window.map.boxZoom, options.interactive && options.scrollEnabled],
            [window.map.scrollWheelZoom, options.interactive && options.zoomEnabled],
            [window.map.doubleClickZoom, options.interactive && options.zoomEnabled],
            [window.map.touchZoom, options.interactive && options.zoomEnabled]
          ];
          interactions.forEach(function (entry) {
            if (entry[1]) entry[0].enable();
            else entry[0].disable();
          });
          if (options.interactive && options.zoomEnabled) {
            window.zoomControl.addTo(window.map);
          } else {
            window.zoomControl.remove();
          }
        };
        window.updateMarkers = function (items, interactive) {
          window.markerLayer.clearLayers();
          items.forEach(function (item, index) {
            var size = Number(item.pinSize) || ${DEFAULT_PIN_SIZE};
            var color = item.pinColor || ${serializeForScript(DEFAULT_PIN_COLOR)};
            var outer = document.createElement("div");
            outer.style.width = size + "px";
            outer.style.height = size + "px";
            outer.style.borderRadius = "50%";
            outer.style.backgroundColor = color;
            outer.style.boxShadow = "0 4px 8px rgba(15,23,42,0.25)";
            outer.style.display = "flex";
            outer.style.alignItems = "center";
            outer.style.justifyContent = "center";
            outer.style.boxSizing = "border-box";
            if (item.active) {
              outer.style.outline = "3px solid #fff";
              outer.style.outlineOffset = "1px";
            }
            var center = document.createElement("div");
            center.style.width = Math.round(size * 0.34) + "px";
            center.style.height = Math.round(size * 0.34) + "px";
            center.style.borderRadius = "50%";
            center.style.backgroundColor = "#fff";
            outer.appendChild(center);
            var marker = L.marker([item.latitude, item.longitude], {
              icon: L.divIcon({
                className: "locali-marker",
                html: outer.outerHTML,
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2]
              }),
              title: item.title || "",
              draggable: interactive && Boolean(item.draggable)
            });
            if (interactive) {
              marker.on("click", function () {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: "markerPress",
                  index: index
                }));
              });
              if (item.draggable) {
                marker.on("dragend", function () {
                  var coordinate = marker.getLatLng();
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: "markerDragEnd",
                    index: index,
                    latitude: coordinate.lat,
                    longitude: coordinate.lng
                  }));
                });
              }
            }
            marker.addTo(window.markerLayer);
          });
        };
        window.map.on("click", function (event) {
          if (window.isInteractive) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: "mapPress",
              latitude: event.latlng.lat,
              longitude: event.latlng.lng
            }));
          }
        });
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: "ready" }));
      });
    </script>
  </body>
</html>`;
};

const MerchantMap = forwardRef<MerchantMapHandle, MerchantMapProps>(
  (
    {
      style,
      initialRegion,
      markers = [],
      onPress,
      interactive = true,
      scrollEnabled = true,
      zoomEnabled = true,
      position,
      onPinChange,
      onMapReady,
    },
    ref
  ) => {
    const webViewRef = useRef<WebView>(null);
    const pageReadyRef = useRef(false);
    const pendingJavaScriptRef = useRef<string[]>([]);
    const callbacksRef = useRef({
      markers,
      onPress,
      onPinChange,
      onMapReady,
    });
    callbacksRef.current = { markers, onPress, onPinChange, onMapReady };

    const [mapTilerKey] = useState(
      () => process.env.EXPO_PUBLIC_MAPTILER_KEY
    );
    const [html] = useState(() =>
      mapTilerKey
        ? createMapHtml(mapTilerKey, initialRegion)
        : null
    );

    const injectJavaScript = useCallback((javascript: string) => {
      if (pageReadyRef.current) {
        webViewRef.current?.injectJavaScript(`${javascript}\ntrue;`);
      } else {
        pendingJavaScriptRef.current.push(javascript);
      }
    }, []);

    const animateToRegion = useCallback(
      (region: MapRegion, durationMs?: number) => {
        const latitudeDelta = region.latitudeDelta ?? DEFAULT_DELTA;
        const zoom = deltaToZoom(latitudeDelta);
        const center = serializeForScript([region.latitude, region.longitude]);
        const duration = Math.max(durationMs ?? 0, 0) / 1000;
        const javascript =
          duration > 0
            ? `if (window.map) window.map.flyTo(${center}, ${zoom}, { duration: ${duration} });`
            : `if (window.map) window.map.setView(${center}, ${zoom}, { animate: false });`;
        injectJavaScript(javascript);
      },
      [injectJavaScript]
    );

    useImperativeHandle(
      ref,
      (): MerchantMapHandle => ({ animateToRegion }),
      [animateToRegion]
    );

    useEffect(() => {
      injectJavaScript(
        `if (window.setMapOptions) window.setMapOptions(${serializeForScript({
          interactive,
          scrollEnabled,
          zoomEnabled,
        })});`
      );
      injectJavaScript(
        `if (window.updateMarkers) window.updateMarkers(${serializeForScript(
          markers.map((marker) => ({
            latitude: marker.coordinate.latitude,
            longitude: marker.coordinate.longitude,
            title: marker.title,
            draggable: marker.draggable,
            pinColor: marker.pinColor,
            pinSize: marker.pinSize,
            active: marker.active,
          }))
        )}, ${interactive});`
      );
    }, [
      injectJavaScript,
      interactive,
      markers,
      scrollEnabled,
      zoomEnabled,
    ]);

    useEffect(() => {
      if (position) {
        animateToRegion({
          ...position,
          latitudeDelta: initialRegion.latitudeDelta ?? DEFAULT_DELTA,
          longitudeDelta: initialRegion.longitudeDelta ?? DEFAULT_DELTA,
        }, 300);
      }
    }, [
      animateToRegion,
      initialRegion.latitudeDelta,
      initialRegion.longitudeDelta,
      position?.latitude,
      position?.longitude,
    ]);

    const handleMessage = useCallback(
      (event: WebViewMessageEvent) => {
        let message: MapWebViewMessage;
        try {
          message = JSON.parse(event.nativeEvent.data) as MapWebViewMessage;
        } catch {
          console.warn("[MerchantMap.native] Received an invalid map message.");
          return;
        }

        if (message.type === "ready") {
          pageReadyRef.current = true;
          callbacksRef.current.onMapReady?.();
          pendingJavaScriptRef.current.splice(0).forEach((javascript) => {
            webViewRef.current?.injectJavaScript(`${javascript}\ntrue;`);
          });
          return;
        }
        if (message.type === "mapPress") {
          const coordinate = {
            latitude: message.latitude,
            longitude: message.longitude,
          };
          callbacksRef.current.onPress?.(coordinate);
          callbacksRef.current.onPinChange?.(coordinate);
          return;
        }
        if (message.type === "markerPress") {
          callbacksRef.current.markers[message.index]?.onPress?.();
          return;
        }
        if (message.type === "markerDragEnd") {
          const coordinate = {
            latitude: message.latitude,
            longitude: message.longitude,
          };
          const marker = callbacksRef.current.markers[message.index];
          marker?.onDragEnd?.(coordinate);
          callbacksRef.current.onPinChange?.(coordinate);
        }
      },
      []
    );

    if (!mapTilerKey || !html) {
      return (
        <View style={[styles.container, style]}>
          <Text style={styles.fallback}>
            Map is unavailable. Set EXPO_PUBLIC_MAPTILER_KEY to display the map.
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.container, style]}>
        <WebView
          ref={webViewRef}
          source={{ html }}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          style={styles.webView}
          onMessage={handleMessage}
          onError={() => {
            console.warn("[MerchantMap.native] WebView failed to load.");
          }}
          onHttpError={(event) => {
            console.warn(
              "[MerchantMap.native] WebView HTTP error:",
              event.nativeEvent.statusCode
            );
          }}
        />
      </View>
    );
  }
);

MerchantMap.displayName = "MerchantMap";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 200,
    overflow: "hidden",
    backgroundColor: "#f2f4f7",
  },
  webView: {
    flex: 1,
    backgroundColor: "#f2f4f7",
  },
  fallback: {
    flex: 1,
    padding: 16,
    textAlign: "center",
    textAlignVertical: "center",
    color: "#475569",
    backgroundColor: "#f2f4f7",
  },
});

export default MerchantMap;
export type {
  MapCoordinate,
  MapRegion,
  MerchantMapHandle,
  MerchantMapMarker,
  MerchantMapProps,
} from "./MerchantMap.types";
