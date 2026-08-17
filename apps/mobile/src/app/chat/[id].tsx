import { View, Text, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Send, MoreVertical, ShieldCheck } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useState } from 'react';
import { format } from 'date-fns';

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: Date;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const currentUserId = 'user-1'; // Mock user

  const [message, setMessage] = useState('');
  
  // Mock data for UI presentation
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      text: 'Chào bạn, máy ảnh này còn trống cuối tuần này không?',
      senderId: 'user-1',
      createdAt: new Date(Date.now() - 3600000),
    },
    {
      id: 'm2',
      text: 'Chào bạn, máy vẫn còn trống nhé. Bạn muốn thuê mấy ngày?',
      senderId: 'user-2',
      createdAt: new Date(Date.now() - 3500000),
    },
  ]);

  const sendMessage = () => {
    if (!message.trim()) return;
    
    setMessages([
      ...messages,
      {
        id: Date.now().toString(),
        text: message.trim(),
        senderId: currentUserId,
        createdAt: new Date(),
      }
    ]);
    setMessage('');
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-row items-center justify-between px-4 py-3 bg-surface z-10 border-b border-border">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full mr-2">
              <ChevronLeft size={28} color="#1F2937" />
            </TouchableOpacity>
            <View>
              <Text className="text-lg font-bold text-text-primary">Nguyễn Văn A</Text>
              <View className="flex-row items-center mt-0.5">
                <ShieldCheck size={12} color={colors.success} />
                <Text className="text-text-secondary text-xs ml-1">Đã xác thực</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity className="p-2 -mr-2">
            <MoreVertical size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 16 }}
          renderItem={({ item }) => {
            const isMe = item.senderId === currentUserId;
            return (
              <View className={`mb-4 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && (
                  <View className="w-8 h-8 rounded-full bg-primary-soft items-center justify-center mr-2 self-end">
                    <Text className="text-primary font-bold text-xs">A</Text>
                  </View>
                )}
                <View className={`max-w-[75%] rounded-2xl p-3 ${isMe ? 'bg-primary rounded-br-none' : 'bg-surface border border-border rounded-bl-none'}`}>
                  <Text className={isMe ? 'text-white' : 'text-text-primary'}>{item.text}</Text>
                  <Text className={`text-[10px] mt-1 text-right ${isMe ? 'text-white/70' : 'text-text-secondary'}`}>
                    {format(item.createdAt, 'HH:mm')}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        <View className="p-4 bg-surface border-t border-border flex-row items-center">
          <TextInput
            className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-text-primary mr-2"
            placeholder="Nhập tin nhắn..."
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            className={`w-10 h-10 rounded-full items-center justify-center ${message.trim() ? 'bg-primary' : 'bg-gray-300'}`}
            onPress={sendMessage}
            disabled={!message.trim()}
          >
            <Send size={18} color="white" className="ml-1" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
