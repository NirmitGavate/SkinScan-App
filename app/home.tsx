<<<<<<< HEAD
import React, { useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  Alert 
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from '@expo/vector-icons';
=======
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Button, Image, StyleSheet, Text, View } from "react-native";
>>>>>>> 2e14e0f44355ef4eb7a53680d589f8724bf22b92

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

  // Upload image to backend - FUNCTIONALITY RESTORED
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
<<<<<<< HEAD
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Skin Health Analysis</Text>
        <Text style={styles.subtitle}>
          Upload a photo of a skin lesion for an AI-powered analysis.
        </Text>
      </View>

      {/* --- Image Analysis Card --- */}
      <View style={styles.card}>
        <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
          {image ? (
            <Image source={{ uri: image }} style={styles.image} />
          ) : (
            <View style={styles.placeholder}>
              <MaterialCommunityIcons name="image-plus" size={50} color="#a0a0a0" />
              <Text style={styles.placeholderText}>Tap to select an image</Text>
            </View>
          )}
        </TouchableOpacity>

        {image && (
          <TouchableOpacity style={styles.uploadButton} onPress={uploadImage}>
            <MaterialCommunityIcons name="cloud-upload-outline" size={24} color="white" />
            <Text style={styles.buttonText}>Upload & Analyze</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* --- Skin Type Quiz Card --- */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Discover Your Skin</Text>
        <Text style={styles.cardSubtitle}>
          Answer a few questions to understand your skin's needs better.
        </Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/skinTypeQuiz')}>
          <MaterialCommunityIcons name="help-circle-outline" size={24} color="#4b7bec" />
          <Text style={styles.secondaryButtonText}>Know Your Skin Type</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.blogsButton} onPress={() => router.push('/blog')}>
        <MaterialCommunityIcons name="book-open-page-variant" size={22} color="#fff" />
        <Text style={styles.blogsButtonText}>View Blogs</Text>
      </TouchableOpacity>
    </ScrollView>
=======
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
>>>>>>> 2e14e0f44355ef4eb7a53680d589f8724bf22b92
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
<<<<<<< HEAD
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    marginBottom: 20,
=======
    backgroundColor: "#f5f5f5",
>>>>>>> 2e14e0f44355ef4eb7a53680d589f8724bf22b92
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  imagePicker: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
<<<<<<< HEAD
  placeholder: {
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    color: '#a0a0a0',
    fontSize: 16,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4b7bec',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '100%',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8eaf6',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 10,
    width: '100%',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#4b7bec',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  blogsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4b7bec',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 20,
  },
  blogsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
=======
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
>>>>>>> 2e14e0f44355ef4eb7a53680d589f8724bf22b92
