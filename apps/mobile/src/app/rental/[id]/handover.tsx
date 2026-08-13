import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/api/client';
import { ChevronLeft, QrCode, ClipboardCheck } from 'lucide-react-native';

export default function HandoverScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { mutate: startHandover, isPending: isStarting } = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/rentals/${id}/handover`, {
        type: 'DELIVERY',
      });
    },
    onSuccess: (res) => {
      const handoverId = res.data.id;
      // Option to show QR code 
      router.push(`/rental/${id}/qr?handoverId=${handoverId}`);
    },
    onError: (error: any) => {
      Alert.alert('Action Failed', error.response?.data?.message || 'Could not start handover');
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-surface z-10 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
          <ChevronLeft size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary">Handover Process</Text>
        <View className="w-10" />
      </View>

      <View className="flex-1 px-5 py-8">
        <Text className="text-xl font-bold text-text-primary mb-6">Choose Handover Method</Text>

        <TouchableOpacity 
          className="bg-surface p-5 rounded-xl border border-border mb-4 flex-row items-center"
          onPress={() => startHandover()}
          disabled={isStarting}
        >
          <View className="bg-primary-soft p-3 rounded-full mr-4">
            <QrCode size={24} color="#4F7C6B" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-text-primary">Generate QR Code</Text>
            <Text className="text-text-secondary text-sm">Owner generates QR, Renter scans to confirm</Text>
          </View>
        </TouchableOpacity>
        
        {/* Simplified manual confirmation for MVP if needed */}
        <TouchableOpacity 
          className="bg-surface p-5 rounded-xl border border-border flex-row items-center"
          onPress={() => Alert.alert('Manual Handover', 'Please use QR code for secure handover.')}
        >
          <View className="bg-gray-100 p-3 rounded-full mr-4">
            <ClipboardCheck size={24} color="#6B7280" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-text-primary text-gray-500">Manual Confirmation</Text>
            <Text className="text-text-secondary text-sm text-gray-400">Currently disabled for security</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
