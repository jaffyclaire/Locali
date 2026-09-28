import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
} from "react";
import { View } from "react-native";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMap, useMapEvent } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import { Colors } from "../constants/theme";
import type {
  MapCoordinate,
  MerchantMapHandle,
  MerchantMapMarker,
  MerchantMapProps,
} from "./MerchantMap.types";

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const DEFAULT_DELTA = 0.01;
const DEFAULT_PIN_COLOR = Colors.teal[700];
const DEFAULT_PIN_SIZE = 32;

/**
 * Leaflet resolves its default marker images relative to the stylesheet URL at
 * runtime, which is always wrong under a bundler. Point it at the imported
 * asset URLs explicitly so pins actually render.
 */
if (typeof window !== "undefined") {
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  });
}

/** Approximate a `latitudeDelta` span as a Leaflet zoom level. */
const deltaToZoom = (latitudeDelta: number): number => {
  const span = Math.max(latitudeDelta, 0.000001);
  return Math.min(Math.max(Math.log2(360 / span), 1), 19);
};

/**
 * Custom marker children are React Native views, which cannot be rendered inside
 * a Leaflet marker (a DOM node). Approximate the native pin with a divIcon
 * styled from the marker's `pinColor` / `pinSize` / `active` hints.
 */
const buildPinIcon = (marker: MerchantMapMarker): L.DivIcon => {
  const size = marker.pinSize ?? DEFAULT_PIN_SIZE;
  const color = marker.pinColor ?? DEFAULT_PIN_COLOR;
  const titleAttr = marker.title
    ? ` title="${marker.title.replace(/"/g, "&quot;")}"`
    : "";

  return L.divIcon({
    className: "locali-map-pin",
    html: `<div${titleAttr} style="
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      background:${color};
      box-shadow:0 4px 8px rgba(15,23,42,0.25);
      display:flex;
      align-items:center;
      justify-content:center;
      box-sizing:border-box;
      ${marker.active ? "outline:3px solid #fff; outline-offset:1px;" : ""}
    "><div style="
      width:${Math.round(size * 0.34)}px;
      height:${Math.round(size * 0.34)}px;
      border-radius:50%;
      background:#fff;
    "></div></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

/**
 * Bridges the imperative `MerchantMapHandle` to the underlying Leaflet map.
 * Must render inside `<MapContainer>` to access the map instance.
 */
const MapController = forwardRef<MerchantMapHandle, object>((_props, ref) => {
    const map = useMap();

    useImperativeHandle(
      ref,
      (): MerchantMapHandle => ({
        animateToRegion: (region, durationMs) => {
          const latLng: L.LatLngExpression = [
            region.latitude,
            region.longitude,
          ];
          const zoom = deltaToZoom(
            region.latitudeDelta ?? DEFAULT_DELTA
          );
          // `flyTo` is Leaflet's closest equivalent to `animateToRegion`.
          if (durationMs && durationMs > 0) {
            map.flyTo(latLng, zoom, {
              duration: durationMs / 1000,
            });
          } else {
            map.setView(latLng, zoom, { animate: false });
          }
        },
      }),
      [map]
    );

    return null;
});

MapController.displayName = "MapController";

/**
 * react-leaflet v5 dropped `eventHandlers` from `MapContainer`, so map-level
 * taps are subscribed through `useMapEvent` from a child instead.
 */
const MapClickBridge: React.FC<{
  onPress: (coordinate: MapCoordinate) => void;
}> = ({ onPress }) => {
  useMapEvent("click", (e: L.LeafletMouseEvent) => {
    onPress({ latitude: e.latlng.lat, longitude: e.latlng.lng });
  });
  return null;
};

MapClickBridge.displayName = "MapClickBridge";

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
    // Leaflet is imperative and must never be re-created on re-render.
    const center = useMemo<L.LatLngExpression>(
      () => [initialRegion.latitude, initialRegion.longitude],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );
    const initialZoom = useMemo(
      () => deltaToZoom(initialRegion.latitudeDelta ?? DEFAULT_DELTA),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );

    const icons = useMemo(
      () => markers.map((m) => buildPinIcon(m)),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [JSON.stringify(markers.map((m) => [m.pinColor, m.pinSize, m.active, m.title]))]
    );

    // "Pitch" and "rotate" have no Leaflet equivalent; a non-interactive map is
    // expressed by disabling every Leaflet interaction control instead.
    const interactionLocked =
      scrollEnabled === false &&
      zoomEnabled === false &&
      pitchEnabled === false &&
      rotateEnabled === false;

    return (
      <View style={style}>
        <MapContainer
          center={center}
          zoom={initialZoom}
          style={{ width: "100%", height: "100%" }}
          scrollWheelZoom={zoomEnabled}
          zoomControl={zoomEnabled && !interactionLocked}
          doubleClickZoom={zoomEnabled}
          dragging={scrollEnabled}
          touchZoom={zoomEnabled}
          keyboard={scrollEnabled}
          boxZoom={scrollEnabled}
          // Always on, including the locked mini-maps: the OpenStreetMap tile
          // usage policy requires visible attribution wherever tiles are shown.
          attributionControl
        >
          <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} />
          <MapController ref={ref} />
          {onPress ? <MapClickBridge onPress={onPress} /> : null}

          {markers.map((marker, index) => {
            const {
              id,
              coordinate,
              title,
              draggable,
              onPress: onMarkerPress,
              onDragEnd,
              children: _children,
              pinColor: _pinColor,
              pinSize: _pinSize,
              active: _active,
            } = marker;

            return (
              <Marker
                key={id ?? `${coordinate.latitude},${coordinate.longitude},${index}`}
                position={[coordinate.latitude, coordinate.longitude]}
                icon={icons[index]}
                draggable={draggable}
                title={title}
                eventHandlers={{
                  ...(onMarkerPress ? { click: onMarkerPress } : {}),
                  ...(onDragEnd
                    ? {
                        dragend: (e: L.DragEndEvent) => {
                          const { lat, lng } = (e.target as L.Marker).getLatLng();
                          onDragEnd({ latitude: lat, longitude: lng });
                        },
                      }
                    : {}),
                }}
              />
            );
          })}
        </MapContainer>
      </View>
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
