import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import MapView, { Marker, UrlTile, PROVIDER_DEFAULT } from "react-native-maps";
import type {
  MapRegion,
  MerchantMapHandle,
  MerchantMapMarker,
  MerchantMapProps,
} from "./MerchantMap.types";

const DEFAULT_DELTA = 0.01;

/**
 * OpenStreetMap tile server URL template.
 * Note: Free OSM tile servers are suitable for development and low-traffic apps.
 * For production at scale, a dedicated or paid tile provider (e.g., Mapbox,
 * Stadia Maps, or a self-hosted tile server) should be used in accordance with
 * the OpenStreetMap Tile Usage Policy.
 */
const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

// On Android, react-native-maps UrlTile does not replace the {s} subdomain wildcard,
// causing DNS resolution errors for "{s}.tile.openstreetmap.org".
// Normalizing {s} to 'a' on Android resolves the tile server hostname properly.
const TILE_URL_TEMPLATE =
  Platform.OS === "android" ? OSM_URL.replace("{s}", "a") : OSM_URL;

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
          mapType={Platform.OS === "android" ? "none" : undefined}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: initialRegion.latitude,
            longitude: initialRegion.longitude,
            latitudeDelta: initialRegion.latitudeDelta ?? DEFAULT_DELTA,
            longitudeDelta: initialRegion.longitudeDelta ?? DEFAULT_DELTA,
          }}
          onMapReady={() => {
            console.log("[MerchantMap.native] onMapReady fired");
            onMapReady?.();
          }}
          onPress={
            onPress
              ? (e) => onPress(e.nativeEvent.coordinate)
              : undefined
          }
          scrollEnabled={scrollEnabled}
          zoomEnabled={zoomEnabled}
          pitchEnabled={pitchEnabled}
          rotateEnabled={rotateEnabled}
        >
          <UrlTile
            urlTemplate={TILE_URL_TEMPLATE}
            maximumZ={19}
            flipY={false}
            zIndex={1}
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
                draggable={draggable}
                onPress={onMarkerPress}
                // react-native-maps hands back a gesture event; unwrap it so the
                // shared prop contract exposes a plain coordinate on both platforms.
                onDragEnd={
                  onDragEnd
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
          <Text style={styles.attributionText}>© OpenStreetMap contributors</Text>
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
