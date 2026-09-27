import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import type {
  MapRegion,
  MerchantMapHandle,
  MerchantMapMarker,
  MerchantMapProps,
} from "./MerchantMap.types";

const DEFAULT_DELTA = 0.01;

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

    return (
      <MapView
        ref={mapRef}
        style={style}
        initialRegion={{
          latitude: initialRegion.latitude,
          longitude: initialRegion.longitude,
          latitudeDelta: initialRegion.latitudeDelta ?? DEFAULT_DELTA,
          longitudeDelta: initialRegion.longitudeDelta ?? DEFAULT_DELTA,
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
    );
  }
);

MerchantMap.displayName = "MerchantMap";

export default MerchantMap;
export type {
  MapCoordinate,
  MapRegion,
  MerchantMapHandle,
  MerchantMapMarker,
  MerchantMapProps,
} from "./MerchantMap.types";
