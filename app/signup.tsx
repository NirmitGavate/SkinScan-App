import React from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function SignUp() {
  const safeAreaInsets = useSafeAreaInsets();
  const router = useRouter();

  const screenHeight = Dimensions.get("window").height;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: safeAreaInsets.top + screenHeight * 0.08,   // 8% of screen height
          paddingBottom: safeAreaInsets.bottom + screenHeight * 0.05, // 5% bottom
        },
      ]}
    >
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join SkinScan today</Text>

      <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#778ca3" />
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#778ca3" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#778ca3" secureTextEntry />

      <TouchableOpacity style={styles.button} onPress={() => alert("Account created!")}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={()=>router.push("/signup")}>
            <Text style={styles.logs} onPress={() => router.push('/signup')}>
              Already a member? Login
            </Text>
        </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", backgroundColor: "#F5FCFF", paddingHorizontal: 20 },
  title: { fontSize: 36, fontWeight: "bold", color: "#4b7bec", marginBottom: 5 },
  subtitle: { fontSize: 16, color: "#778ca3", marginBottom: 20 },
  input: { width: "100%", borderWidth: 1, borderColor: "#d1d8e0", borderRadius: 10, padding: 15, fontSize: 16, marginBottom: 15, color: "#2d3436" },
  button: { backgroundColor: "#4b7bec", paddingVertical: 15, paddingHorizontal: 40, borderRadius: 25, marginTop: 10 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  logs: { fontSize: 16, color:'#4b7bec',textAlign: 'center', marginTop: 20 },
});
