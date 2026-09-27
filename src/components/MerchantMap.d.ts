/**
 * TypeScript resolution shim for the platform-split `MerchantMap` module.
 *
 * The real implementations are `MerchantMap.native.tsx` (react-native-maps) and
 * `MerchantMap.web.tsx` (react-leaflet + OpenStreetMap). Metro picks the correct
 * file per platform, but `tsc` does not understand `.native` / `.web`
 * extensions, so it would fail to resolve `components/MerchantMap`.
 *
 * Metro never resolves this file: `.d.ts` is not in `resolver.sourceExts`, and
 * the platform-specific `.tsx` files are matched first regardless.
 *
 * Both implementations intentionally share the exact prop contract declared in
 * `./MerchantMap.types`, so this declaration is accurate for either platform.
 */
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import type { MerchantMapHandle, MerchantMapProps } from "./MerchantMap.types";

declare const MerchantMap: ForwardRefExoticComponent<
  MerchantMapProps & RefAttributes<MerchantMapHandle>
>;

export default MerchantMap;
export * from "./MerchantMap.types";
