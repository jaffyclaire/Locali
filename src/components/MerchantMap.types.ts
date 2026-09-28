import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

/**
 * Shared types for the platform-split MerchantMap component.
 *
 * `MerchantMap.native.tsx` renders with `react-native-maps` (Google/Apple maps).
 * `MerchantMap.web.tsx` renders with `react-leaflet` + OpenStreetMap tiles.
 * Both consume this identical prop contract.
 */

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

export interface MapRegion extends MapCoordinate {
  latitudeDelta?: number;
  longitudeDelta?: number;
}

export interface MerchantMapMarker {
  /** Stable key. Falls back to the coordinate string when omitted. */
  id?: string | number;
  coordinate: MapCoordinate;
  title?: string;
  description?: string;
  draggable?: boolean;
  onPress?: () => void;
  /** Fired on marker drag end with the new coordinate, on both platforms. */
  onDragEnd?: (coordinate: MapCoordinate) => void;
  /**
   * Custom marker content (e.g. `<CustomMarker />`).
   *
   * Rendered verbatim on native. On web this CANNOT be rendered — Leaflet markers
   * are DOM nodes — so the web build falls back to a `divIcon` styled from
   * `pinColor` / `pinSize` instead.
   */
  children?: ReactNode;
  /** Web-only: background color of the fallback DOM pin. Defaults to theme indigo. */
  pinColor?: string;
  /** Web-only: diameter in px of the fallback DOM pin. Defaults to 32. */
  pinSize?: number;
  /** Web-only: renders a white ring around the pin, matching the native "active" state. */
  active?: boolean;
}

export interface MerchantMapProps {
  style?: StyleProp<ViewStyle>;
  initialRegion: MapRegion;
  markers?: MerchantMapMarker[];
  /** Fired when the map surface itself is tapped, with the tapped coordinate. */
  onPress?: (coordinate: MapCoordinate) => void;
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  pitchEnabled?: boolean;
  rotateEnabled?: boolean;
  /**
   * Controlled position for the primary marker. When provided, the map will
   * re-center on this coordinate and the marker will follow it.
   */
  position?: MapCoordinate;
  /**
   * Fired when the user taps the map or finishes dragging the pin.
   * Use this to implement two-way address/pin binding.
   */
  onPinChange?: (coordinate: MapCoordinate) => void;
  /** Fired when the map finishes loading. */
  onMapReady?: () => void;
}

/**
 * Imperative handle exposed on both platforms, so callers can keep using the
 * `react-native-maps` `animateToRegion` call shape unchanged.
 */
export interface MerchantMapHandle {
  animateToRegion: (
    region: MapRegion & { latitudeDelta: number; longitudeDelta: number },
    durationMs?: number
  ) => void;
}
