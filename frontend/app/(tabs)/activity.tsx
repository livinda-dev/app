import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Activity {
  id: string;
  type: string;
  duration: number;
  distance?: number;
  date: string;
  notes?: string;
}

export default function ActivityScreen() {
  const { token } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [activityType, setActivityType] = useState('walk');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [activitiesRes, statsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/activity?limit=20`, { headers }),
        axios.get(`${BACKEND_URL}/api/activity/stats`, { headers }),
      ]);

      setActivities(activitiesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Load activities error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddActivity = async () => {
    if (!duration) {
      Alert.alert('Error', 'Please enter duration');
      return;
    }

    setSubmitting(true);

    try {
      await axios.post(
        `${BACKEND_URL}/api/activity`,
        {
          type: activityType,
          duration: parseInt(duration),
          distance: distance ? parseFloat(distance) : null,
          notes: notes || null,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert('Success', 'Activity logged successfully!');
      setModalVisible(false);
      setDuration('');
      setDistance('');
      setNotes('');
      loadActivities();
    } catch (error) {
      console.error('Add activity error:', error);
      Alert.alert('Error', 'Failed to log activity');
    } finally {
      setSubmitting(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'walk':
        return 'walk';
      case 'run':
        return 'fitness';
      case 'cycle':
        return 'bicycle';
      default:
        return 'fitness';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'walk':
        return '#27AE60';
      case 'run':
        return '#E74C3C';
      case 'cycle':
        return '#3498DB';
      default:
        return '#95A5A6';
    }
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity Tracker</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Stats Section */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="time" size={32} color="#4A90E2" />
              <Text style={styles.statValue}>{stats.total_duration}</Text>
              <Text style={styles.statLabel}>Minutes</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="navigate" size={32} color="#27AE60" />
              <Text style={styles.statValue}>{stats.total_distance}</Text>
              <Text style={styles.statLabel}>Km</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="trophy" size={32} color="#F39C12" />
              <Text style={styles.statValue}>{stats.total_activities}</Text>
              <Text style={styles.statLabel}>Activities</Text>
            </View>
          </View>
        )}

        {/* Activities List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activities</Text>
          {activities.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="fitness-outline" size={64} color="#BDC3C7" />
              <Text style={styles.emptyText}>No activities yet</Text>
              <Text style={styles.emptySubtext}>Tap + to log your first activity</Text>
            </View>
          ) : (
            activities.map((activity) => (
              <View key={activity.id} style={styles.activityCard}>
                <View
                  style={[
                    styles.activityIcon,
                    { backgroundColor: getActivityColor(activity.type) },
                  ]}
                >
                  <Ionicons
                    name={getActivityIcon(activity.type)}
                    size={24}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityType}>
                    {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                  </Text>
                  <View style={styles.activityDetails}>
                    <Text style={styles.activityDetail}>
                      {activity.duration} min
                    </Text>
                    {activity.distance && (
                      <Text style={styles.activityDetail}>
                        • {activity.distance} km
                      </Text>
                    )}
                  </View>
                  <Text style={styles.activityDate}>
                    {new Date(activity.date).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Activity Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Activity</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#2C3E50" />
              </TouchableOpacity>
            </View>

            {/* Activity Type Selection */}
            <Text style={styles.label}>Activity Type</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  activityType === 'walk' && styles.typeButtonActive,
                ]}
                onPress={() => setActivityType('walk')}
              >
                <Ionicons name="walk" size={24} color={activityType === 'walk' ? '#FFFFFF' : '#27AE60'} />
                <Text style={[styles.typeText, activityType === 'walk' && styles.typeTextActive]}>Walk</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  activityType === 'run' && styles.typeButtonActive,
                ]}
                onPress={() => setActivityType('run')}
              >
                <Ionicons name="fitness" size={24} color={activityType === 'run' ? '#FFFFFF' : '#E74C3C'} />
                <Text style={[styles.typeText, activityType === 'run' && styles.typeTextActive]}>Run</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  activityType === 'cycle' && styles.typeButtonActive,
                ]}
                onPress={() => setActivityType('cycle')}
              >
                <Ionicons name="bicycle" size={24} color={activityType === 'cycle' ? '#FFFFFF' : '#3498DB'} />
                <Text style={[styles.typeText, activityType === 'cycle' && styles.typeTextActive]}>Cycle</Text>
              </TouchableOpacity>
            </View>

            {/* Duration Input */}
            <Text style={styles.label}>Duration (minutes) *</Text>
            <TextInput
              style={styles.input}
              placeholder="30"
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
            />

            {/* Distance Input */}
            <Text style={styles.label}>Distance (km)</Text>
            <TextInput
              style={styles.input}
              placeholder="5.0"
              value={distance}
              onChangeText={setDistance}
              keyboardType="decimal-pad"
            />

            {/* Notes Input */}
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="How did you feel?"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleAddActivity}
              disabled={submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Logging...' : 'Log Activity'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7F8C8D',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95A5A6',
    marginTop: 8,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
    marginLeft: 16,
  },
  activityType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  activityDetails: {
    flexDirection: 'row',
    marginTop: 4,
  },
  activityDetail: {
    fontSize: 14,
    color: '#7F8C8D',
    marginRight: 4,
  },
  activityDate: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
    marginTop: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  typeButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 8,
  },
  typeTextActive: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#F5F7FA',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: '#2C3E50',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});