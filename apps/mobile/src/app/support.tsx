import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, MessageCircle, Phone, Mail, FileText } from 'lucide-react-native';
import { colors } from '../theme/colors';

export default function SupportScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-surface z-10 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
          <ChevronLeft size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary">Hỗ trợ</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-4 py-6">
        <View className="items-center mb-8">
          <MessageCircle size={64} color={colors.primary.DEFAULT} />
          <Text className="text-xl font-bold text-text-primary mt-4 mb-2">Chúng tôi có thể giúp gì?</Text>
          <Text className="text-text-secondary text-center px-4 leading-5">
            Đội ngũ hỗ trợ của Borrow Hub luôn sẵn sàng giải đáp thắc mắc và hỗ trợ bạn trong suốt quá trình thuê và cho thuê.
          </Text>
        </View>

        <View className="mb-6">
          <TouchableOpacity 
            className="bg-surface p-4 rounded-xl mb-3 border border-border flex-row items-center"
            onPress={() => Linking.openURL('tel:1900xxxx')}
          >
            <View className="bg-primary-soft p-3 rounded-full mr-4">
              <Phone size={24} color={colors.primary.DEFAULT} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-text-primary">Hotline 24/7</Text>
              <Text className="text-text-secondary text-sm">Gọi ngay cho tổng đài chăm sóc khách hàng</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            className="bg-surface p-4 rounded-xl mb-3 border border-border flex-row items-center"
            onPress={() => Linking.openURL('mailto:support@borrowhub.vn')}
          >
            <View className="bg-primary-soft p-3 rounded-full mr-4">
              <Mail size={24} color={colors.primary.DEFAULT} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-text-primary">Gửi Email</Text>
              <Text className="text-text-secondary text-sm">support@borrowhub.vn</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            className="bg-surface p-4 rounded-xl border border-border flex-row items-center"
          >
            <View className="bg-primary-soft p-3 rounded-full mr-4">
              <FileText size={24} color={colors.primary.DEFAULT} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-text-primary">Câu hỏi thường gặp (FAQ)</Text>
              <Text className="text-text-secondary text-sm">Tìm câu trả lời cho các vấn đề phổ biến</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
