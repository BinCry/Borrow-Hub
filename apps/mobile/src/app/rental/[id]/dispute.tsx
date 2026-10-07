import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useRental } from '../../../hooks/useRentals';
import { apiClient } from '../../../services/api/client';
import { Dispute, DisputesService } from '../../../services/disputes/disputes.service';
import { RentalsService } from '../../../services/rentals/rentals.service';

type Mode = 'damage' | 'not-returned' | undefined;

export default function RentalDisputeScreen() {
  const params = useLocalSearchParams<{ id: string; mode?: string }>();
  const rentalId = Array.isArray(params.id) ? params.id[0] : params.id;
  const mode: Mode = params.mode === 'damage' || params.mode === 'not-returned' ? params.mode : undefined;
  const router = useRouter();
  const queryClient = useQueryClient();
  const rentalQuery = useRental(rentalId);
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await apiClient.get<{ id: string }>('/auth/me')).data,
  });
  const disputesQuery = useQuery({
    queryKey: ['disputes', 'mine', rentalId],
    queryFn: () => DisputesService.listMine(),
    enabled: Boolean(rentalId) && !mode,
  });
  const [description, setDescription] = useState('');
  const [estimate, setEstimate] = useState('');
  const [response, setResponse] = useState('');

  const finish = () => {
    void queryClient.invalidateQueries({ queryKey: ['rentals', 'detail', rentalId] });
    void queryClient.invalidateQueries({ queryKey: ['rentals', 'list'] });
    void queryClient.invalidateQueries({ queryKey: ['disputes', 'mine', rentalId] });
    router.back();
  };

  const issueMutation = useMutation({
    mutationFn: () => {
      if (mode === 'damage') {
        return RentalsService.reportIssue(rentalId, {
          description: description.trim(),
          ...(estimate.trim() ? { repairEstimate: Number(estimate) } : {}),
        });
      }
      return RentalsService.markAssetNotReturned(rentalId, description);
    },
    onSuccess: finish,
    onError: (error: any) => {
      Alert.alert('Cannot open dispute', error.response?.data?.message ?? 'Please try again.');
    },
  });

  const dispute = disputesQuery.data?.find((item) => item.rentalId === rentalId);
  const respondMutation = useMutation({
    mutationFn: (item: Dispute) => DisputesService.respond(item.id, { content: response.trim() }),
    onSuccess: () => {
      setResponse('');
      void disputesQuery.refetch();
    },
    onError: () => Alert.alert('Cannot send response', 'The dispute may be closed or inaccessible.'),
  });
  const acceptMutation = useMutation({
    mutationFn: (item: Dispute) => DisputesService.acceptDamageReport(item.id),
    onSuccess: finish,
    onError: () => Alert.alert('Cannot accept report', 'This is not an active damage dispute you can accept.'),
  });

  if (rentalQuery.isLoading || meQuery.isLoading || (!mode && disputesQuery.isLoading)) {
    return <SafeAreaView className="flex-1 items-center justify-center bg-background"><ActivityIndicator /></SafeAreaView>;
  }

  if (rentalQuery.isError || !rentalQuery.data || meQuery.isError || !meQuery.data) {
    return <SafeAreaView className="flex-1 bg-background"><EmptyState title="Cannot load dispute" description="Check your connection and try again." buttonText="Back" onPress={() => router.back()} /></SafeAreaView>;
  }

  if (mode) {
    const isDamage = mode === 'damage';
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <Header title={isDamage ? 'Report damage' : 'Report asset not returned'} onBack={() => router.back()} />
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          <Text className="mb-3 text-lg font-extrabold text-text-primary">{rentalQuery.data.asset?.title ?? 'Rental'}</Text>
          <TextInput
            className="min-h-28 rounded-xl border border-border bg-surface px-4 py-3 text-text-primary"
            multiline
            textAlignVertical="top"
            placeholder={isDamage ? 'Describe the damage...' : 'Describe why the asset was not returned...'}
            value={description}
            onChangeText={setDescription}
          />
          {isDamage ? (
            <TextInput
              className="mt-3 rounded-xl border border-border bg-surface px-4 py-3 text-text-primary"
              keyboardType="numeric"
              placeholder="Repair estimate (optional)"
              value={estimate}
              onChangeText={setEstimate}
            />
          ) : null}
          <PrimaryButton label="Submit dispute" disabled={!description.trim() || issueMutation.isPending} onPress={() => issueMutation.mutate()} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!dispute) {
    return <SafeAreaView className="flex-1 bg-background"><EmptyState title="No dispute found" description="The dispute may already be resolved or inaccessible." buttonText="Back" onPress={() => router.back()} /></SafeAreaView>;
  }

  const canAccept = dispute.reason === 'RETURN_ISSUE' && dispute.openedById === dispute.rental.ownerId && meQuery.data.id === dispute.rental.renterId;
  const mutable = ['OPEN', 'WAITING_RESPONSE', 'UNDER_REVIEW'].includes(dispute.status);
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Header title="Dispute details" onBack={() => router.back()} />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <View className="rounded-2xl border border-border bg-surface p-4">
          <Text className="text-xl font-extrabold text-text-primary">{dispute.rental.asset?.title ?? 'Dispute'}</Text>
          <Text className="mt-2 text-text-secondary">{dispute.description}</Text>
          <Text className="mt-3 font-bold text-danger">Status: {dispute.status}</Text>
          {dispute.resolutionSummary ? <Text className="mt-2 text-text-secondary">Resolution: {dispute.resolutionSummary}</Text> : null}
        </View>
        <View className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <Text className="mb-3 font-extrabold text-text-primary">Response</Text>
          <TextInput className="min-h-28 rounded-xl border border-border bg-background px-4 py-3 text-text-primary" multiline textAlignVertical="top" placeholder="Add your response..." value={response} onChangeText={setResponse} />
          <PrimaryButton label="Send response" disabled={!mutable || !response.trim() || respondMutation.isPending} onPress={() => respondMutation.mutate(dispute)} />
          {canAccept ? <PrimaryButton label="Accept damage report" disabled={!mutable || acceptMutation.isPending} onPress={() => acceptMutation.mutate(dispute)} /> : null}
        </View>
        <View className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <Text className="mb-3 font-extrabold text-text-primary">Timeline</Text>
          {dispute.events.map((event) => <View key={event.id} className="mb-3 border-b border-divider pb-3"><Text className="font-bold text-text-primary">{event.eventType}</Text><Text className="mt-1 text-text-secondary">{event.content}</Text></View>)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return <View className="flex-row items-center border-b border-border bg-surface px-4 py-3"><TouchableOpacity onPress={onBack} className="mr-3 rounded-full p-2"><ChevronLeft size={26} color="#1F2937" /></TouchableOpacity><Text className="text-lg font-extrabold text-text-primary">{title}</Text></View>;
}

function PrimaryButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return <TouchableOpacity className={`mt-3 min-h-12 items-center justify-center rounded-xl bg-primary px-4 ${disabled ? 'opacity-50' : ''}`} disabled={disabled} onPress={onPress}><Text className="font-extrabold text-white">{label}</Text></TouchableOpacity>;
}
