import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GiftedChat, IMessage, Bubble, InputToolbar } from 'react-native-gifted-chat';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ChatScreen() {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(Date.now().toString());

  useEffect(() => {
    setMessages([
      {
        _id: 1,
        text: "Hello! I'm your AI health assistant. How can I help you today? Feel free to describe any symptoms or health concerns you have.",
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'Health Assistant',
          avatar: '🩺',
        },
      },
    ]);
  }, []);

  const onSend = useCallback(async (newMessages: IMessage[] = []) => {
    const userMessage = newMessages[0];
    
    // Add user message immediately
    setMessages((previousMessages) =>
      GiftedChat.append(previousMessages, newMessages)
    );

    setLoading(true);

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/chat/symptom-check`,
        {
          message: userMessage.text,
          session_id: sessionId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const aiResponse: IMessage = {
        _id: Date.now(),
        text: response.data.response,
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'Health Assistant',
          avatar: '🩺',
        },
      };

      setMessages((previousMessages) =>
        GiftedChat.append(previousMessages, [aiResponse])
      );
    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: IMessage = {
        _id: Date.now(),
        text: "I'm sorry, I'm having trouble processing your request right now. Please try again.",
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'Health Assistant',
          avatar: '🩺',
        },
      };

      setMessages((previousMessages) =>
        GiftedChat.append(previousMessages, [errorMessage])
      );
    } finally {
      setLoading(false);
    }
  }, [token, sessionId]);

  const renderBubble = (props: any) => {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: {
            backgroundColor: '#4A90E2',
          },
          left: {
            backgroundColor: '#E8F4FD',
          },
        }}
        textStyle={{
          right: {
            color: '#FFFFFF',
          },
          left: {
            color: '#2C3E50',
          },
        }}
      />
    );
  };

  const renderInputToolbar = (props: any) => {
    return (
      <InputToolbar
        {...props}
        containerStyle={styles.inputToolbar}
        primaryStyle={styles.inputPrimary}
      />
    );
  };

  const renderFooter = () => {
    if (loading) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color="#4A90E2" />
          <Text style={styles.loadingText}>Thinking...</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Health Assistant</Text>
        <Text style={styles.headerSubtitle}>Educational guidance only</Text>
      </View>
      
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <GiftedChat
          messages={messages}
          onSend={(messages) => onSend(messages)}
          user={{
            _id: user?.id || '1',
            name: user?.name || 'You',
          }}
          renderBubble={renderBubble}
          renderInputToolbar={renderInputToolbar}
          renderFooter={renderFooter}
          alwaysShowSend
          scrollToBottom
          placeholder="Describe your symptoms..."
          textInputProps={{
            style: styles.textInput,
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
  },
  chatContainer: {
    flex: 1,
  },
  inputToolbar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingVertical: 4,
  },
  inputPrimary: {
    alignItems: 'center',
  },
  textInput: {
    fontSize: 16,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#7F8C8D',
  },
});