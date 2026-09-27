export type Role = "shopper" | "merchant" | "merchant_owner" | "admin";

export type AuthScreen = "signin" | "signup" | "onboarding" | "merchant-setup";
export type ShopperScreen = "home" | "discover" | "notifications" | "settings";
export type MerchantScreen = "dashboard" | "myshop" | "activity" | "account" | "alerts";
export type MainScreen = ShopperScreen | MerchantScreen;
export type Screen = AuthScreen | MainScreen;

export interface UserNotificationPreferences {
  proximityAlerts?: boolean;
  merchantAlerts?: boolean;
  dealAlerts?: boolean;
  [key: string]: boolean | undefined;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  name: string; // for backward compatibility with UI
  email: string;
  initials: string;
  avatarUrl?: string;
  role: Role;
  createdAt?: any;
  interests?: string[];
  notificationPreferences?: UserNotificationPreferences;
}

export interface OperatingHoursDay {
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface Merchant {
  id: string | number;
  name: string;
  category: string;
  tag?: string;
  distance: string;
  rating: number;
  reviews: number;
  isOpen: boolean;
  isNew?: boolean;
  hours?: string;
  img: string;
  address?: string;
  ownerId?: string;
  description?: string;
  contact?: string;
  latitude?: number;
  longitude?: number;
  coverPhotoUrl?: string;
  isVerified?: boolean;
  verifiedTodayAt?: string | null;
  sponsored?: boolean;
  ratingCount?: number;
  weeklyHours?: Record<string, OperatingHoursDay>;
  photos?: string[];
}

export interface MapMerchant extends Merchant {
  lat: number;
  lng: number;
  type: "standard" | "new" | "sponsored";
}

export interface NewMerchant {
  id: string | number;
  name: string;
  category: string;
  distance: string;
  img: string;
}

export interface HeroAd {
  id: string | number;
  merchant: string;
  headline: string;
  sub: string;
  cta: string;
  img: string;
  accent: string;
}

export interface SponsoredCardItem {
  id: string | number;
  name: string;
  category: string;
  distance: string;
  rating: number;
  reviews: number;
  isOpen: boolean;
  discount: string;
  img: string;
  tag: string;
}

export interface NotificationItem {
  id: string | number;
  tab: "Updates" | "Saved Deals";
  icon: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
}

export interface FlagReportItem {
  id: string | number;
  reporter: string;
  issue: string;
  detail: string;
  time: string;
  resolved: boolean;
  merchantId?: string | number;
  reporterId?: string;
  status?: string;
  resolutionAction?: string;
}

export interface DailyHourItem {
  day: string;
  hours: string;
}

export interface FirestoreReview {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: any;
  updatedAt?: any;
}

// --- Admin types ---
export interface AdminDashboardStats {
  totalUsers: number;
  totalMerchants: number;
  totalFlagReports: number;
  pendingFlagReports: number;
  verifiedMerchants: number;
  suspendedUsers: number;
  newUsersToday: number;
  newMerchantsToday: number;
}

export interface AdminUser {
  uid: string;
  fullName: string;
  email: string;
  role: Role;
  createdAt: any;
  disabled: boolean;
  interests?: string[];
}

export interface AdminMerchant {
  id: string;
  name: string;
  category: string;
  ownerId: string;
  isVerified: boolean;
  suspended: boolean;
  createdAt: any;
  address?: string;
  description?: string;
  coverPhotoUrl?: string;
}
