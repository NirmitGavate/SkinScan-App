import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from 'expo-location';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

interface WeatherData {
  temp: number;
  uvi: number;
}

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const router = useRouter();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission denied');
        setLoadingWeather(false);
        return;
      }

      try {
        let location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        
        const BACKEND_WEATHER_URL = `http://10.0.2.2:5000/api/weather?lat=${latitude}&lon=${longitude}`;
        
        const response = await fetch(BACKEND_WEATHER_URL);
        const data = await response.json();

        if (response.ok) {
          setWeather({ temp: data.temp, uvi: data.uvi });
        } else {
          setErrorMsg(data.error || 'Failed to fetch weather');
        }
      } catch (error) {
        setErrorMsg('Error fetching weather data from backend.');
        console.error(error);
      } finally {
        setLoadingWeather(false);
      }
    })();
  }, []);

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
        headers: { "Content-Type": "multipart/form-data" },
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert("Analysis Complete", `Detections: ${JSON.stringify(data.detections)}`);
      } else {
        Alert.alert("Error", data.error || "Upload failed");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Something went wrong!");
    }
  };
  
  const getUvIndexInfo = (uvi: number) => {
    const uviValue = Math.round(uvi);
    if (uviValue <= 2) return { level: 'Low', color: '#5cb85c' };
    if (uviValue <= 5) return { level: 'Moderate', color: '#f0ad4e' };
    if (uviValue <= 7) return { level: 'High', color: '#d9534f' };
    if (uviValue <= 10) return { level: 'Very High', color: '#d9534f' };
    return { level: 'Extreme', color: '#8B008B' };
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Skin Health Analysis</Text>
        <Text style={styles.subtitle}>Upload a photo of a skin lesion for an AI-powered analysis.</Text>
      </View>

      <View style={styles.card}>
        <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
          {image ? <Image source={{ uri: image }} style={styles.image} /> : 
            <View style={styles.placeholder}><MaterialCommunityIcons name="image-plus" size={50} color="#a0a0a0" /><Text style={styles.placeholderText}>Tap to select an image</Text></View>}
        </TouchableOpacity>
        {image && <TouchableOpacity style={styles.uploadButton} onPress={uploadImage}><MaterialCommunityIcons name="cloud-upload-outline" size={24} color="white" /><Text style={styles.buttonText}>Upload & Analyze</Text></TouchableOpacity>}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Discover Your Skin</Text>
        <Text style={styles.cardSubtitle}>Answer a few questions to understand your skin's needs better.</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/skinTypeQuiz')}><MaterialCommunityIcons name="help-circle-outline" size={24} color="#4b7bec" /><Text style={styles.secondaryButtonText}>Know Your Skin Type</Text></TouchableOpacity>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Local Conditions</Text>
        <Text style={styles.cardSubtitle}>Stay informed about your environment.</Text>
        {loadingWeather ? (
          <ActivityIndicator size="large" color="#4b7bec" style={{ marginVertical: 20 }}/>
        ) : errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : weather ? (
          <View style={styles.weatherContainer}>
            <View style={styles.weatherItem}>
              <Feather name="thermometer" size={24} color="#4b7bec" />
              <Text style={styles.weatherData}>{Math.round(weather.temp)}°C</Text>
              <Text style={styles.weatherLabel}>Temperature</Text>
            </View>
            <View style={styles.weatherItem}>
              <Feather name="sun" size={24} color={getUvIndexInfo(weather.uvi).color} />
              <Text style={[styles.weatherData, { color: getUvIndexInfo(weather.uvi).color }]}>{getUvIndexInfo(weather.uvi).level}</Text>
              <Text style={styles.weatherLabel}>UV Index</Text>
            </View>
          </View>
        ) : null}
      </View>
      
      <TouchableOpacity style={styles.blogsButton} onPress={() => router.push('/blog')}>
        <MaterialCommunityIcons name="book-open-page-variant" size={22} color="#fff" />
        <Text style={styles.blogsButtonText}>View Blogs</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, backgroundColor: '#f5f5f5', alignItems: 'center' },
  header: { width: '100%', marginBottom: 20, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: "bold", color: '#333' },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginTop: 4 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, width: '100%', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, alignItems: 'center' },
  imagePicker: { width: '100%', height: 200, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0', borderWidth: 2, borderColor: '#ddd', borderStyle: 'dashed', marginBottom: 20 },
  image: { width: '100%', height: '100%', borderRadius: 10 },
  placeholder: { alignItems: 'center' },
  placeholderText: { marginTop: 8, color: '#a0a0a0', fontSize: 16 },
  uploadButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4b7bec', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, width: '100%', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  cardSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginVertical: 8, marginBottom: 15, },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8eaf6', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, marginTop: 10, width: '100%', justifyContent: 'center' },
  secondaryButtonText: { color: '#4b7bec', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  blogsButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4b7bec', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20, alignSelf: 'center', marginBottom: 20, },
  blogsButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  weatherContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 10, paddingHorizontal: 10, },
  weatherItem: { alignItems: 'center', flex: 1, paddingVertical: 10, marginHorizontal: 5, borderRadius: 8, backgroundColor: '#f8f8f8', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1, },
  weatherData: { fontSize: 22, fontWeight: 'bold', color: '#4b7bec', marginTop: 8, },
  weatherLabel: { fontSize: 14, color: '#666', marginTop: 4, textAlign: 'center', },
  errorText: { fontSize: 16, color: '#d9534f', marginVertical: 20, textAlign: 'center', }
});