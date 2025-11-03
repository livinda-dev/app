import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: '28823270577-kj9q4l1srv2tflmus990dj3t0g9k72o1.apps.googleusercontent.com',
    iosClientId: '28823270577-kj9q4l1srv2tflmus990dj3t0g9k72o1.apps.googleusercontent.com',
    androidClientId: '28823270577-kj9q4l1srv2tflmus990dj3t0g9k72o1.apps.googleusercontent.com',
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleSignIn(id_token);
    }
  }, [response]);

  const handleGoogleSignIn = async (idToken: string) => {
    try {
      setLoading(true);
      await login(idToken);
      router.replace('/(tabs)/home');
    } catch (error) {
      Alert.alert('Login Failed', 'Unable to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons name="fitness" size={80} color="#4A90E2" />
          <Text style={styles.title}>Health Companion</Text>
          <Text style={styles.subtitle}>Your AI-powered health assistant</Text>
        </View>

        <View style={styles.features}>
          <FeatureItem
            icon="chatbubbles"
            title="AI Symptom Checker"
            description="Get instant health guidance"
          />
          <FeatureItem
            icon="fitness-outline"
            title="Activity Tracker"
            description="Track your daily activities"
          />
          <FeatureItem
            icon="partly-sunny"
            title="Weather Alerts"
            description="Health tips based on weather"
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.googleButton, loading && styles.buttonDisabled]}
            onPress={() => promptAsync()}
            disabled={loading || !request}
          >
            <Ionicons name="logo-google" size={24} color="#FFFFFF" />
            <Text style={styles.googleButtonText}>
              {loading ? 'Signing in...' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          This app provides general health information only.
          Always consult healthcare professionals for medical advice.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, title, description }: any) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon} size={32} color="#4A90E2" />
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 8,
    textAlign: 'center',
  },
  features: {
    marginBottom: 48,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  featureText: {
    marginLeft: 16,
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  featureDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 4,
  },
  buttonContainer: {
    marginBottom: 24,
  },
  googleButton: {
    backgroundColor: '#4285F4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  disclaimer: {
    fontSize: 12,
    color: '#95A5A6',
    textAlign: 'center',
    lineHeight: 18,
  },
});