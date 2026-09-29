import React from "react";
import { Tabs, Redirect } from "expo-router";
import { Platform, View, ActivityIndicator } from "react-native";
import { Colors } from "../../src/constants/theme";
import { useAuthRole } from "../../src/context/AuthRoleContext";
import {
  HomeIcon,
  CompassIcon,
  BellIcon,
  PersonIcon,
} from "../../src/components/icons/AppIcons";

export default function ShopperTabsLayout() {
  const { role, isAuthenticated, isLoading } = useAuthRole();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors.white,
        }}
      >
        <ActivityIndicator size="large" color={Colors.teal[700]} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/signin" />;
  }

  if (role === "merchant" || (role as string) === "merchant_owner") {
    return <Redirect href="/(merchant)/dashboard" />;
  }

  if (role === "admin") {
    return <Redirect href="/(admin)/dashboard" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.teal[700],
        tabBarInactiveTintColor: Colors.slate[400],
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.slate[100],
          height: Platform.OS === "ios" ? 84 : 64,
          paddingBottom: Platform.OS === "ios" ? 28 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <HomeIcon
              size={22}
              active={focused}
              color={focused ? Colors.teal[700] : Colors.slate[400]}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ focused }) => (
            <CompassIcon
              size={22}
              active={focused}
              color={focused ? Colors.teal[700] : Colors.slate[400]}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ focused }) => (
            <BellIcon
              size={22}
              active={focused}
              color={focused ? Colors.teal[700] : Colors.slate[400]}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <PersonIcon
              size={22}
              active={focused}
              color={focused ? Colors.teal[700] : Colors.slate[400]}
            />
          ),
        }}
      />
    </Tabs>
  );
}

