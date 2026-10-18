import React, { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Colors } from "../constants/theme";
import { MapViewIcon } from "./icons/AppIcons";
import { CustomMarker } from "./map/CustomMarker";

const TILE_SIZE = 256;
const MAX_MERCATOR_LATITUDE = 85.05112878;
const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY;

type MerchantPinType = "standard" | "new" | "sponsored";

interface TileMapPreviewProps {
  latitude: number;
  longitude: number;
  width: number;
  height: number;
  zoom?: number;
  pinType?: MerchantPinType;
}

export const TileMapPreview: React.FC<TileMapPreviewProps> = ({
  latitude,
  longitude,
  width,
  height,
  zoom = 15,
  pinType = "standard",
}) => {
  const [hasTileError, setHasTileError] = useState(false);
  const coordinatesValid =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  if (!MAPTILER_KEY || !coordinatesValid || hasTileError) {
    return (
      <View style={[styles.fallback, { width, height }]}>
        <MapViewIcon size={26} color={Colors.slate[400]} />
      </View>
    );
  }

  const tileCount = 2 ** zoom;
  const latitudeRadians =
    (Math.max(
      -MAX_MERCATOR_LATITUDE,
      Math.min(MAX_MERCATOR_LATITUDE, latitude)
    ) *
      Math.PI) /
    180;
  const tileX = ((longitude + 180) / 360) * tileCount;
  const tileY =
    ((1 -
      Math.log(
        Math.tan(latitudeRadians) + 1 / Math.cos(latitudeRadians)
      ) /
        Math.PI) /
      2) *
    tileCount;
  const centerPixelX = tileX * TILE_SIZE;
  const centerPixelY = tileY * TILE_SIZE;
  const leftPixel = centerPixelX - width / 2;
  const topPixel = centerPixelY - height / 2;
  const firstTileX = Math.floor(leftPixel / TILE_SIZE);
  const firstTileY = Math.floor(topPixel / TILE_SIZE);
  const columnCount =
    Math.ceil((leftPixel - firstTileX * TILE_SIZE + width) / TILE_SIZE);
  const rowCount =
    Math.ceil((topPixel - firstTileY * TILE_SIZE + height) / TILE_SIZE);
  const tiles = [];

  for (let row = 0; row < rowCount; row += 1) {
    for (let column = 0; column < columnCount; column += 1) {
      const unwrappedX = firstTileX + column;
      const y = firstTileY + row;
      if (y < 0 || y >= tileCount) continue;

      const x = ((unwrappedX % tileCount) + tileCount) % tileCount;
      tiles.push({
        key: `${zoom}:${unwrappedX}:${y}`,
        url: `https://api.maptiler.com/maps/streets-v2/256/${zoom}/${x}/${y}.png?key=${encodeURIComponent(MAPTILER_KEY)}`,
        left: unwrappedX * TILE_SIZE - leftPixel,
        top: y * TILE_SIZE - topPixel,
      });
    }
  }

  return (
    <View style={[styles.container, { width, height }]}>
      {tiles.map((tile) => (
        <Image
          key={tile.key}
          source={{ uri: tile.url }}
          style={[styles.tile, { left: tile.left, top: tile.top }]}
          onError={() => setHasTileError(true)}
        />
      ))}
      <View pointerEvents="none" style={styles.pin}>
        <CustomMarker type={pinType} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    position: "relative",
    backgroundColor: Colors.slate[100],
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    position: "absolute",
  },
  pin: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.slate[100],
  },
});
