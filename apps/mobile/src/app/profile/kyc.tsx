import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Upload, ShieldCheck, CreditCard } from 'lucide-react-native';
import { colors } from '../../theme/colors';

export default function KYCScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-surface z-10 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
          <ChevronLeft size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary">Xác thực danh tính (KYC)</Text>
        <View className="w-10" />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView 
          className="flex-1 px-5 py-6"
          contentContainerStyle={{ paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center mb-8">
            <View className="w-20 h-20 bg-primary-soft rounded-full items-center justify-center mb-4 border-4 border-white shadow-sm">
              <ShieldCheck size={40} color={colors.primary.DEFAULT} />
            </View>
            <Text className="text-2xl font-extrabold text-text-primary mb-2 tracking-tight">Bảo vệ cộng đồng</Text>
            <Text className="text-text-secondary text-center px-4 leading-6 text-base">
              Xác thực danh tính giúp tăng độ tin cậy của bạn và giữ cho cộng đồng Borrow Hub luôn an toàn.
            </Text>
          </View>

          <View className="mb-6">
            <Text className="text-text-secondary text-xs uppercase font-extrabold tracking-widest mb-3 ml-1">Thông tin cá nhân</Text>
            <View className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
              <TextInput
                className="px-4 py-4 text-text-primary text-base border-b border-gray-100"
                placeholder="Họ và tên (theo CCCD)"
                placeholderTextColor="#9CA3AF"
              />
              <TextInput
                className="px-4 py-4 text-text-primary text-base"
                placeholder="Số Căn cước công dân"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View className="mb-8">
            <Text className="text-text-secondary text-xs uppercase font-extrabold tracking-widest mb-3 ml-1">Tài liệu xác minh</Text>
            
            <TouchableOpacity className="bg-surface border-2 border-dashed border-primary/30 rounded-2xl p-6 items-center justify-center mb-4 shadow-sm active:border-primary/60 transition-colors">
              <View className="w-14 h-14 rounded-full bg-primary-soft items-center justify-center mb-3">
                <CreditCard size={28} color={colors.primary.DEFAULT} />
              </View>
              <Text className="text-text-primary font-bold mb-1">Mặt trước CCCD</Text>
              <Text className="text-text-secondary text-xs">Nhấn để tải lên (JPG, PNG)</Text>
            </TouchableOpacity>

            <TouchableOpacity className="bg-surface border-2 border-dashed border-primary/30 rounded-2xl p-6 items-center justify-center shadow-sm active:border-primary/60 transition-colors">
              <View className="w-14 h-14 rounded-full bg-primary-soft items-center justify-center mb-3">
                <CreditCard size={28} color={colors.primary.DEFAULT} />
              </View>
              <Text className="text-text-primary font-bold mb-1">Mặt sau CCCD</Text>
              <Text className="text-text-secondary text-xs">Nhấn để tải lên (JPG, PNG)</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View className="px-5 py-5 bg-surface border-t border-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <TouchableOpacity 
          className="bg-primary rounded-xl py-4 items-center shadow-md flex-row justify-center"
          onPress={() => {
            Alert.alert('Đã nhận', 'Yêu cầu xác minh của bạn đang được xử lý.');
            router.back();
          }}
        >
          <Upload size={20} color="white" className="mr-2" />
          <Text className="text-white font-bold text-lg">Gửi yêu cầu xác thực</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
