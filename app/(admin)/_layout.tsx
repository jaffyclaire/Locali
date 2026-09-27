import React from "react";
import { Tabs, router } from "expo-router";
import { Platform, View, Text, ActivityIndicator } from "react-native";
import { Colors } from "../../src/constants/theme";
import { useAuthRole } from "../../src/context/AuthRoleContext";
import {
  GridIcon,
  UsersIcon,
  ShopIcon,
} from "../../src/components/icons/AppIcons";

export default function AdminTabsLayout() {
  const { role, isLoading } = useAuthRole();

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
        <ActivityIndicator size="large" color={Colors.teal[600]} />
      </View>
    );
  }

  if (role !== "admin") {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors.white,
          padding: 24,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: Colors.slate[800],
            marginBottom: 8,
          }}
        >
          Access Denied
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: Colors.slate[500],
            textAlign: "center",
          }}
        >
          You do not have admin privileges.
        </Text>
      </View>
    );
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
        name="users"
        options={{
          title: "Users",
          tabBarIcon: ({ focused }) => (
            <UsersIcon
              size={22}
              active={focused}
              color={focused ? Colors.teal[700] : Colors.slate[400]}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="merchants"
        options={{
          title: "Merchants",
          tabBarIcon: ({ focused }) => (
            <ShopIcon
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
