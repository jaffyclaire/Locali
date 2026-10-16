import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import MapView, { Marker, UrlTile, PROVIDER_DEFAULT } from "react-native-maps";
import type {
  MapRegion,
  MerchantMapHandle,
  MerchantMapMarker,
  MerchantMapProps,
} from "./MerchantMap.types";

const DEFAULT_DELTA = 0.01;
const TILE_URL = `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${process.env.EXPO_PUBLIC_MAPTILER_KEY ?? ""}`;
const HAS_MAPTILER_KEY = Boolean(process.env.EXPO_PUBLIC_MAPTILER_KEY);
let hasMapTilerProbeRun = false;

const probeMapTilerFromDevice = async (region: MapRegion) => {
  if (!HAS_MAPTILER_KEY || hasMapTilerProbeRun) return;
  hasMapTilerProbeRun = true;

  const zoom = 14;
  const tilesPerAxis = 2 ** zoom;
  const latitude = Math.max(-85.0511, Math.min(85.0511, region.latitude));
  const latitudeRadians = (latitude * Math.PI) / 180;
  const x = Math.floor(((region.longitude + 180) / 360) * tilesPerAxis);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latitudeRadians) + 1 / Math.cos(latitudeRadians)) / Math.PI) /
      2) *
      tilesPerAxis
  );
  const probeUrl = TILE_URL.replace("{z}", String(zoom))
    .replace("{x}", String(x))
    .replace("{y}", String(y));

  try {
    const response = await fetch(probeUrl);
    console.log(
      `[MerchantMap.native] Device tile probe: HTTP ${response.status}; content-type=${response.headers.get("content-type") ?? "unknown"}`
    );
  } catch (error) {
    console.warn(
      "[MerchantMap.native] Device tile probe failed:",
      error instanceof Error ? error.message : "unknown network error"
    );
  }
};

/**
 * Native map surface backed by `react-native-maps`.
 *
 * This is a faithful extraction of the map JSX that previously lived inline in
 * `app/(auth)/merchant-setup.tsx`, `app/(shopper)/discover.tsx` and
 * `src/components/common/MerchantSheet.tsx`. Marker children render natively, so
 * custom pins (`CustomMarker`, bespoke pin views) work exactly as before.
 */
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
      pitchEnabled = true,
      rotateEnabled = true,
      position,
      onPinChange,
      onMapReady,
    },
    ref
  ) => {
    const mapRef = useRef<MapView>(null);

    useImperativeHandle(
      ref,
      (): MerchantMapHandle => ({
        animateToRegion: (region, durationMs) => {
          mapRef.current?.animateToRegion(
            {
              latitude: region.latitude,
              longitude: region.longitude,
              latitudeDelta: region.latitudeDelta ?? DEFAULT_DELTA,
              longitudeDelta: region.longitudeDelta ?? DEFAULT_DELTA,
            },
            durationMs
          );
        },
      }),
      []
    );

    // When a controlled position changes, re-center the map on it.
    React.useEffect(() => {
      if (position) {
        mapRef.current?.animateToRegion(
          {
            latitude: position.latitude,
            longitude: position.longitude,
            latitudeDelta: initialRegion.latitudeDelta ?? DEFAULT_DELTA,
            longitudeDelta: initialRegion.longitudeDelta ?? DEFAULT_DELTA,
          },
          300
        );
      }
    }, [position?.latitude, position?.longitude]);

    return (
      <View style={[styles.container, style]}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          mapType="none"
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: initialRegion.latitude,
            longitude: initialRegion.longitude,
            latitudeDelta: initialRegion.latitudeDelta ?? DEFAULT_DELTA,
            longitudeDelta: initialRegion.longitudeDelta ?? DEFAULT_DELTA,
          }}
          onMapReady={() => {
            console.log("[MerchantMap.native] onMapReady fired");
            console.log(
              `[MerchantMap.native] MapTiler UrlTile configured; key present: ${HAS_MAPTILER_KEY}`
            );
            void probeMapTilerFromDevice(initialRegion);
            if (!HAS_MAPTILER_KEY) {
              console.warn(
                "[MerchantMap.native] EXPO_PUBLIC_MAPTILER_KEY is missing; MapTiler tiles will not load."
              );
            }
            onMapReady?.();
          }}
          onPress={
            interactive && onPress
              ? (e) => onPress(e.nativeEvent.coordinate)
              : undefined
          }
          scrollEnabled={interactive && scrollEnabled}
          zoomEnabled={interactive && zoomEnabled}
          pitchEnabled={interactive && pitchEnabled}
          rotateEnabled={interactive && rotateEnabled}
        >
          <UrlTile
            urlTemplate={TILE_URL}
            maximumZ={19}
            tileSize={256}
            zIndex={-1}
          />
          {markers.map((marker: MerchantMapMarker, index: number) => {
            const {
              id,
              coordinate,
              title,
              description,
              draggable,
              onPress: onMarkerPress,
              onDragEnd,
              children,
              // Web-only presentation hints — not part of the native Marker API,
              // so they are deliberately dropped here.
              pinColor: _pinColor,
              pinSize: _pinSize,
              active: _active,
            } = marker;

            return (
              <Marker
                key={id ?? `${coordinate.latitude},${coordinate.longitude},${index}`}
                coordinate={coordinate}
                title={title}
                description={description}
                draggable={interactive && draggable}
                onPress={interactive ? onMarkerPress : undefined}
                // react-native-maps hands back a gesture event; unwrap it so the
                // shared prop contract exposes a plain coordinate on both platforms.
                onDragEnd={
                  interactive && onDragEnd
                    ? (e) => onDragEnd(e.nativeEvent.coordinate)
                    : undefined
                }
              >
                {children}
              </Marker>
            );
          })}
        </MapView>
        <View style={styles.attributionBadge} pointerEvents="none">
          <Text style={styles.attributionText}>
            © MapTiler © OpenStreetMap contributors
          </Text>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    position: "relative",
  },
  attributionBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
    zIndex: 10,
  },
  attributionText: {
    fontSize: 9,
    color: "#475569",
  },
});

MerchantMap.displayName = "MerchantMap";

export default MerchantMap;
export type {
  MapCoordinate,
  MapRegion,
  MerchantMapHandle,
  MerchantMapMarker,
  MerchantMapProps,
} from "./MerchantMap.types";
