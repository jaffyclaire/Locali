import React from "react";
import Svg, { Path, Rect, SvgProps } from "react-native-svg";
import { Colors } from "../../constants/theme";

interface IconProps extends SvgProps {
  size?: number;
  color?: string;
  active?: boolean;
}

export const HomeIcon: React.FC<IconProps> = ({ size = 24, active = false, color, ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color || (active ? Colors.indigo[600] : Colors.slate[400])} {...props}>
    <Path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </Svg>
);

export const CompassIcon: React.FC<IconProps> = ({ size = 24, active = false, color, ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color || (active ? Colors.indigo[600] : Colors.slate[400])} {...props}>
    <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13l-3 9 9-3-6-6z" />
  </Svg>
);

export const BellIcon: React.FC<IconProps> = ({ size = 24, active = false, color, ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color || (active ? Colors.indigo[600] : Colors.slate[400])} {...props}>
    <Path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
  </Svg>
);

export const PersonIcon: React.FC<IconProps> = ({ size = 24, active = false, color, ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color || (active ? Colors.indigo[600] : Colors.slate[400])} {...props}>
    <Path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </Svg>
);

export const LocationIcon: React.FC<IconProps> = ({ size = 16, color = Colors.indigo[600], ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
  </Svg>
);

export const StarIcon: React.FC<IconProps> = ({ size = 12, color = Colors.amber[500], ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <Path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
  </Svg>
);

export const ChevronRight: React.FC<IconProps> = ({ size = 20, color = Colors.slate[400], ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <Path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
  </Svg>
);

export const ChevronDownIcon: React.FC<IconProps> = ({ size = 16, color = Colors.slate[400], ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <Path d="M7 10l5 5 5-5z" />
  </Svg>
);

export const CheckIcon: React.FC<IconProps> = ({ size = 16, color = Colors.emerald[600], ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <Path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </Svg>
);

export const CloseIcon: React.FC<IconProps> = ({ size = 20, color = Colors.slate[500], ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <Path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </Svg>
);

export const ShopIcon: React.FC<IconProps> = ({ size = 24, active = false, color, ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color || (active ? Colors.teal[700] : Colors.slate[400])} {...props}>
    <Path d="M20 4H4v2l8 5 8-5V4zm0 4.23l-8 5-8-5V20h16V8.23z" />
  </Svg>
);

export const GridIcon: React.FC<IconProps> = ({ size = 24, active = false, color, ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color || (active ? Colors.teal[700] : Colors.slate[400])} {...props}>
    <Path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z" />
  </Svg>
);

export const ActivityIcon: React.FC<IconProps> = ({ size = 24, active = false, color, ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color || (active ? Colors.teal[700] : Colors.slate[400])} {...props}>
    <Path d="M13 2.05v2.02c3.95.49 7 3.85 7 7.93 0 3.21-1.81 6-4.5 7.54L13 17v5h5l-1.22-1.22C19.91 19.07 22 15.76 22 12c0-5.18-3.95-9.45-9-9.95zM11 2.05C5.95 2.55 2 6.82 2 12c0 3.76 2.09 7.07 5.22 8.78L6 22h5v-5l-2.5 2.47C6.81 18 5 15.21 5 12c0-4.08 3.05-7.44 7-7.93V2.05z" />
  </Svg>
);

export const SearchIcon: React.FC<IconProps> = ({ size = 16, color = Colors.slate[400], ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <Path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </Svg>
);

export const FilterIcon: React.FC<IconProps> = ({ size = 18, color = Colors.slate[600], ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <Path d="M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39A1 1 0 0018.95 4H5.04a1 1 0 00-.79 1.61z" />
  </Svg>
);

export const RecenterIcon: React.FC<IconProps> = ({ size = 22, color = Colors.white, ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <Path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
  </Svg>
);

export const BackArrowIcon: React.FC<IconProps> = ({ size = 24, color = Colors.slate[400], ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <Path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
  </Svg>
);

export const ListViewIcon: React.FC<IconProps> = ({ size = 14, color = Colors.slate[600], ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <Path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
  </Svg>
);

export const MapViewIcon: React.FC<IconProps> = ({ size = 14, color = Colors.slate[600], ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
  </Svg>
);

export const PlusIcon: React.FC<IconProps> = ({ size = 20, color = Colors.slate[400], ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <Path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
  </Svg>
);

export const PhotoUploadIcon: React.FC<IconProps> = ({ size = 20, color = Colors.indigo[600], ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <Path d="M19 7v2.99s-1.99.01-2 0V7h-3s.01-1.99 0-2h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8h-3zM5 19l3-4 2 3 3-4 4 5H5z" />
  </Svg>
);

export const GoogleIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </Svg>
);

export const TagIcon: React.FC<IconProps> = ({ size = 16, color = Colors.teal[600], ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <Path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
  </Svg>
);

export const AlertTriangleIcon: React.FC<IconProps> = ({ size = 16, color = Colors.rose[500], ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <Path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
  </Svg>
);

export const ShieldIcon: React.FC<IconProps> = ({ size = 24, active = false, color, ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color || (active ? Colors.teal[700] : Colors.slate[400])} {...props}>
    <Path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
  </Svg>
);

export const UsersIcon: React.FC<IconProps> = ({ size = 24, active = false, color, ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color || (active ? Colors.teal[700] : Colors.slate[400])} {...props}>
    <Path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
  </Svg>
);

export const FlagIcon: React.FC<IconProps> = ({ size = 24, active = false, color, ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color || (active ? Colors.teal[700] : Colors.slate[400])} {...props}>
    <Path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" />
  </Svg>
);

export const BanIcon: React.FC<IconProps> = ({ size = 16, color = Colors.rose[500], ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z" />
  </Svg>
);

export const EyeIcon: React.FC<IconProps> = ({ size = 16, color = Colors.slate[400], ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <Path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
  </Svg>
);

export const EyeOffIcon: React.FC<IconProps> = ({ size = 16, color = Colors.slate[400], ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <Path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
  </Svg>
);

export const FireIcon: React.FC<IconProps> = ({ size = 16, color = Colors.amber[500], ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <Path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
  </Svg>
);

export const MegaphoneIcon: React.FC<IconProps> = ({ size = 16, color = Colors.teal[600], ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <Path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z" />
  </Svg>
);

export const ClockIcon: React.FC<IconProps> = ({ size = 16, color = Colors.slate[500], ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <Path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
  </Svg>
);

export const BoltIcon: React.FC<IconProps> = ({ size = 16, color = Colors.amber[500], ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <Path d="M7 2v11h3v9l7-12h-4l4-8z" />
  </Svg>
);

export const RightArrowIcon: React.FC<IconProps> = ({ size = 16, color = Colors.slate[400], ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <Path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
  </Svg>
);

