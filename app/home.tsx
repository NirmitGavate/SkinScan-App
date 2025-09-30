import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Button, Image, StyleSheet, Text, View } from "react-native";

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const router = useRouter();

  // Pick image from gallery
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // Upload image to backend
  const uploadImage = async () => {
    if (!image) {
      Alert.alert("No image selected", "Please select an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", {
      uri: image,
      name: "photo.jpg",
      type: "image/jpeg",
    } as any);

    try {
      const response = await fetch("http://10.0.2.2:5000/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert("Success", "Image uploaded successfully!");
      } else {
        Alert.alert("Error", data.error || "Upload failed");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Something went wrong!");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Image for Analysis</Text>

      <View style={styles.buttonContainer}>
        <Button title="Pick an image" onPress={pickImage} />
        <Button title="Upload Image" onPress={uploadImage} />
      </View>

      {image && <Image source={{ uri: image }} style={styles.image} />}
      
      {/* 👇 New Button for Skin Type Quiz */}
      <View style={styles.quizButtonContainer}>
        <Button 
          title="Know Your Skin Type" 
          onPress={() => router.push('/skinTypeQuiz')} 
          color="#4b7bec"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#f5f5f5",
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  image: {
    width: 200,
    height: 200,
    marginVertical: 16,
    borderRadius: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
    marginBottom: 20,
  },
  quizButtonContainer: {
    marginTop: 20,
    width: '80%',
  }
});
