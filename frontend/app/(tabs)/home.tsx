import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function HomeScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [weather, setWeather] = useState<any>(null);
  const [healthSummary, setHealthSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    requestNotificationPermission();
  }, []);

  const requestNotificationPermission = async () => {
    try {
      const { Notifications } = await import('expo-notifications');
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
    } catch (error) {
      console.log('Notification permission error:', error);
    }
  };

  const loadData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [weatherRes, summaryRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/weather?city=London`, { headers }),
        axios.get(`${BACKEND_URL}/api/user/health-summary`, { headers }),
      ]);

      setWeather(weatherRes.data);
      setHealthSummary(summaryRes.data);
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
          <Ionicons name="notifications-outline" size={28} color="#2C3E50" />
        </View>

        {/* Weather Card */}
        {weather && (
          <View style={styles.weatherCard}>
            <View style={styles.weatherHeader}>
              <Ionicons name="partly-sunny" size={48} color="#FFA500" />
              <View style={styles.weatherInfo}>
                <Text style={styles.weatherTemp}>{Math.round(weather.temperature)}°C</Text>
                <Text style={styles.weatherCondition}>{weather.condition}</Text>
              </View>
            </View>
            <View style={styles.weatherAlert}>
              <Ionicons name="information-circle" size={20} color="#4A90E2" />
              <Text style={styles.weatherAlertText}>{weather.alert_message}</Text>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <ActionCard
              icon="chatbubbles"
              title="AI Chat"
              color="#4A90E2"
              onPress={() => router.push('/(tabs)/chat')}
            />
            <ActionCard
              icon="fitness"
              title="Log Activity"
              color="#27AE60"
              onPress={() => router.push('/(tabs)/activity')}
            />
          </View>
        </View>

        {/* Health Summary */}
        {healthSummary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Health Summary</Text>
            <View style={styles.summaryCard}>
              <SummaryItem
                icon="chatbubbles-outline"
                label="Total Chats"
                value={healthSummary.total_chats || 0}
                color="#4A90E2"
              />
              <SummaryItem
                icon="fitness-outline"
                label="Activities"
                value={healthSummary.total_activities || 0}
                color="#27AE60"
              />
            </View>
            
            {healthSummary.last_chat && (
              <View style={styles.recentCard}>
                <Text style={styles.recentTitle}>Last Chat</Text>
                <Text style={styles.recentText} numberOfLines={2}>
                  {healthSummary.last_chat.content}
                </Text>
                <Text style={styles.recentTime}>
                  {new Date(healthSummary.last_chat.timestamp).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Daily Tip */}
        <View style={styles.tipCard}>
          <Ionicons name="bulb" size={24} color="#F39C12" />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Daily Health Tip</Text>
            <Text style={styles.tipText}>
              Stay hydrated! Aim for 8 glasses of water daily to keep your body functioning optimally.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionCard({ icon, title, color, onPress }: any) {
  return (
    <TouchableOpacity style={[styles.actionCard, { borderColor: color }]} onPress={onPress}>
      <Ionicons name={icon} size={32} color={color} />
      <Text style={styles.actionTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

function SummaryItem({ icon, label, value, color }: any) {
  return (
    <View style={styles.summaryItem}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 4,
  },
  weatherCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherInfo: {
    marginLeft: 16,
  },
  weatherTemp: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  weatherCondition: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  weatherAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#E8F4FD',
    borderRadius: 8,
  },
  weatherAlertText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    justifyContent: 'space-around',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
  },
  recentCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  recentText: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },
  recentTime: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 8,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    marginHorizontal: 24,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F39C12',
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },
});