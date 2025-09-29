import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Dimensions, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function SignUp() {
  const safeAreaInsets = useSafeAreaInsets();
  const router = useRouter();

  const screenHeight = Dimensions.get("window").height;

  const [fullName,setFullName]=useState(" ")
  const [email,setEmail]=useState(" ")
  const [password,setPassword]=useState(" ")

  const handleSignUp = async () => {              
  try {                                         
    const response = await fetch("http://10.0.2.2:5000/api/signup", {  
      method: "POST",                           // option inside fetch object
      headers: { "Content-Type": "application/json" },  // headers object start & end
      body: JSON.stringify({ full_name: fullName, email, password }), // body object for fetch
    });                                         // 3️⃣ Close fetch options object

    const data = await response.json();        // get JSON from response

    // if (response.ok) {                        
    //   Alert.alert("Success", data.message);   // show success alert
    //   router.push("/login");                   // navigate to login
    // } else {                                   
    //   Alert.alert("Error", data.message || "Something went wrong");  
    // }                                       

  } catch (error) {                            
    console.error(error);                      
    Alert.alert("Error", "Unable to connect to server"); 
  }                                            
};      

  return (
    <View
  style={[
    styles.container,
    {
      paddingTop: safeAreaInsets.top + screenHeight * 0.08,
      paddingBottom: safeAreaInsets.bottom + screenHeight * 0.05,
    },
  ]}
>
  <Text style={styles.title}>Create Account</Text>
  <Text style={styles.subtitle}>Join SkinScan today</Text>

  {/* Full Name */}
  <Text style={styles.label}>Full Name</Text>
  <TextInput
    style={styles.input}
    placeholder="Enter your full name"
    placeholderTextColor="#778ca3"
    value={fullName}
    onChangeText={setFullName}
  />

  {/* Email */}
  <Text style={styles.label}>Email</Text>
  <TextInput
    style={styles.input}
    placeholder="Enter your email"
    placeholderTextColor="#778ca3"
    keyboardType="email-address"
    value={email}
    onChangeText={setEmail}
  />

  {/* Password */}
  <Text style={styles.label}>Password</Text>
  <TextInput
    style={styles.input}
    placeholder="Enter your password"
    placeholderTextColor="#778ca3"
    secureTextEntry
    value={password}
    onChangeText={setPassword}
  />

  <TouchableOpacity style={styles.button} onPress={handleSignUp}>
    <Text style={styles.buttonText}>Sign Up</Text>
  </TouchableOpacity>

  <TouchableOpacity onPress={() => router.push("/login")}>
    <Text style={styles.logs}>Already a member? Login</Text>
  </TouchableOpacity>
</View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", backgroundColor: "#F5FCFF", paddingHorizontal: 20 },
  label: { width: "100%", fontSize: 14, fontWeight: "500", color: "#34495e", marginBottom: 5 },
  title: { fontSize: 36, fontWeight: "bold", color: "#4b7bec", marginBottom: 5 },
  subtitle: { fontSize: 16, color: "#778ca3", marginBottom: 20 },
  input: { width: "100%", borderWidth: 1, borderColor: "#d1d8e0", borderRadius: 10, padding: 15, fontSize: 16, marginBottom: 15, color: "#2d3436" },
  button: { backgroundColor: "#4b7bec", paddingVertical: 15, paddingHorizontal: 40, borderRadius: 25, marginTop: 10 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  logs: { fontSize: 16, color:'#4b7bec',textAlign: 'center', marginTop: 20 },
});
