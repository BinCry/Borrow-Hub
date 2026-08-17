import { colors } from '../../../theme/colors';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import { ChevronLeft, FileText, CheckCircle } from 'lucide-react-native';
import { useState } from 'react';

export default function ContractScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [agreed, setAgreed] = useState(false);

  const { mutate: signContract, isPending } = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/rentals/${id}/sign`, {
        signatureMethod: 'IN_APP',
      });
    },
    onSuccess: () => {
      Alert.alert('Contract Signed', 'You have successfully signed the rental contract.');
      queryClient.invalidateQueries({ queryKey: ['rental', id] });
      router.back();
    },
    onError: (error: any) => {
      Alert.alert('Signing Failed', error.response?.data?.message || 'Could not sign contract');
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-surface z-10 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
          <ChevronLeft size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary">Electronic Contract</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-5 py-4">
        <View className="items-center mb-6">
          <FileText size={48} color={colors.primary.DEFAULT} />
          <Text className="text-xl font-bold text-text-primary mt-2">Rental Agreement</Text>
        </View>

        <View className="bg-surface p-4 rounded-xl border border-border mb-6">
          <Text className="text-base font-semibold text-text-primary mb-2">Terms and Conditions</Text>
          <Text className="text-text-secondary text-sm leading-5">
            By signing this electronic contract, both parties agree to the following:
            {'\n\n'}
            1. The Renter agrees to use the asset responsibly and return it in the same condition as received.
            {'\n'}
            2. The Owner agrees that the asset is in good working condition and matches the description.
            {'\n'}
            3. Any damages or loss will be handled through the platform's dispute resolution process.
            {'\n'}
            4. Handover must be completed using the provided QR code or manual confirmation.
          </Text>
        </View>

        <TouchableOpacity 
          className="flex-row items-center mb-8"
          onPress={() => setAgreed(!agreed)}
        >
          <View className={`w-6 h-6 rounded-md border items-center justify-center mr-3 ${agreed ? 'bg-primary border-primary' : 'border-border'}`}>
            {agreed && <CheckCircle size={16} color="white" />}
          </View>
          <Text className="text-text-primary flex-1">I have read and agree to the terms and conditions of this rental contract.</Text>
        </TouchableOpacity>
      </ScrollView>

      <View className="px-5 py-4 bg-surface border-t border-border">
        <TouchableOpacity 
          className={`w-full py-4 rounded-xl items-center ${agreed && !isPending ? 'bg-primary' : 'bg-gray-300'}`}
          onPress={() => signContract()}
          disabled={!agreed || isPending}
        >
          {isPending ? (
             <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Sign Contract</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
