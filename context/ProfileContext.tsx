import React, { createContext, ReactNode, useContext, useState } from 'react';

interface ProfileState {
  username: string;
  email: string;
  fitzpatrickLevel: number;
  skinType: string;
  skinConditions: string[];
  profilePicture: string;
}

interface ProfileContextType {
  profile: ProfileState;
  loading: boolean;
  updateProfile: (updates: Partial<ProfileState>) => Promise<void>;
  updateSkinTone: (level: number) => Promise<void>;
  loadProfile: (username: string, email?: string) => Promise<void>;
  setUserCredentials: (username: string, email: string) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const defaultProfile: ProfileState = {
  username: '',
  email: '',
  fitzpatrickLevel: 3,
  skinType: '',
  skinConditions: [],
  profilePicture: '',
};

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<ProfileState>(defaultProfile);
  const [loading, setLoading] = useState(false);

  // Use your computer's IP address instead of localhost
  // On Windows: ipconfig, On Mac/Linux: ifconfig
  const API_BASE_URL = 'http://192.168.0.103:5000'; // CHANGE THIS TO YOUR IP
  // OR for Android emulator: 'http://10.0.2.2:5000/api'
  // OR for iOS simulator: 'http://localhost:5000/api'

  const setUserCredentials = (username: string, email: string) => {
    console.log(`Setting user credentials: ${username}, ${email}`);
    setProfile(prev => ({
      ...prev,
      username,
      email
    }));
    // Auto-load profile after setting credentials
    loadProfile(username, email);
  };

  const loadProfile = async (username: string, email?: string) => {
    try {
      setLoading(true);
      console.log(`Loading profile for: ${username}`);
      
      const response = await fetch(`${API_BASE_URL}/profile/${username}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.profile) {
        const profileData = result.profile;
        setProfile({
          username: profileData.userId || username,
          email: profileData.personalInfo?.email || email || '',
          fitzpatrickLevel: profileData.skinProfile?.fitzpatrickLevel || 3,
          skinType: profileData.skinProfile?.skinType || '',
          skinConditions: profileData.skinProfile?.conditions || [],
          profilePicture: '',
        });
        console.log('Profile loaded successfully');
      } else {
        console.log('No profile found, creating default');
        setProfile({
          ...defaultProfile,
          username: username,
          email: email || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      // Create default profile if loading fails
      setProfile({
        ...defaultProfile,
        username: username,
        email: email || ''
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<ProfileState>) => {
    try {
      setLoading(true);
      console.log('Updating profile with:', updates);
      
      const updatedProfile = { ...profile, ...updates };
      setProfile(updatedProfile);
      
      const response = await fetch(`${API_BASE_URL}/api/profile/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: updatedProfile.username,
          name: updatedProfile.username,
          email: updatedProfile.email,
          fitzpatrickLevel: updatedProfile.fitzpatrickLevel,
          skinType: updatedProfile.skinType,
          skinConditions: updatedProfile.skinConditions,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('Profile updated successfully in database');
        return Promise.resolve();
      } else {
        throw new Error(result.error || 'Failed to update profile in database');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error; // Re-throw to handle in component
    } finally {
      setLoading(false);
    }
  };

  const updateSkinTone = async (level: number) => {
    try {
      setLoading(true);
      console.log(`Updating skin tone to: ${level}`);
      
      const updatedProfile = { ...profile, fitzpatrickLevel: level };
      setProfile(updatedProfile);
      
      const response = await fetch(`${API_BASE_URL}/api/profile/update_skin_tone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: profile.username,
          fitzpatrickLevel: level,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('Skin tone updated successfully in database');
        return Promise.resolve();
      } else {
        throw new Error(result.error || 'Failed to update skin tone');
      }
    } catch (error) {
      console.error('Error updating skin tone:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProfileContext.Provider value={{ 
      profile, 
      loading, 
      updateProfile, 
      updateSkinTone,
      loadProfile,
      setUserCredentials
    }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
