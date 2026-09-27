import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthRoleProvider } from "../src/context/AuthRoleContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthRoleProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(shopper)" />
          <Stack.Screen name="(merchant)" />
          <Stack.Screen name="(admin)" />
        </Stack>
      </AuthRoleProvider>
    </SafeAreaProvider>
  );
}

