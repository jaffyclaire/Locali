import React from "react";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { Colors } from "../../src/constants/theme";
import {
  GridIcon,
  ShopIcon,
  ActivityIcon,
  PersonIcon,
} from "../../src/components/icons/AppIcons";

export default function MerchantTabsLayout() {
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
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused }) => (
            <GridIcon
              size={22}
              active={focused}
              color={focused ? Colors.teal[700] : Colors.slate[400]}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="myshop"
        options={{
          title: "My Shop",
          tabBarIcon: ({ focused }) => (
            <ShopIcon
              size={22}
              active={focused}
              color={focused ? Colors.teal[700] : Colors.slate[400]}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Activity",
          tabBarIcon: ({ focused }) => (
            <ActivityIcon
              size={22}
              active={focused}
              color={focused ? Colors.teal[700] : Colors.slate[400]}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
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

