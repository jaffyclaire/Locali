import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { useAuthRole } from "../src/context/AuthRoleContext";
import { Colors } from "../src/constants/theme";

export default function Index() {
  const { isAuthenticated, role, isLoading } = useAuthRole();

  if (isLoading) {
    return (
      <View style={styles.center}>
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

  return <Redirect href="/(shopper)/home" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },
});
