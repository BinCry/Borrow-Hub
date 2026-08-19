import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateRentalPayload, RentalsService } from '../services/rentals/rentals.service';

export const useRentals = (role: 'renter' | 'owner') =>
  useQuery({
    queryKey: ['rentals', 'list', role],
    queryFn: () => RentalsService.getMyRentals(role),
  });

export const useRental = (id: string) =>
  useQuery({
    queryKey: ['rentals', 'detail', id],
    queryFn: () => RentalsService.getById(id),
    enabled: Boolean(id),
  });

export const useCreateRental = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRentalPayload) => RentalsService.create(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['rentals', 'list'] }),
  });
};

function useRentalMutation(
  mutationFn: (variables: { id: string; reason?: string }) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['rentals', 'detail', variables.id],
      });
      void queryClient.invalidateQueries({ queryKey: ['rentals', 'list'] });
    },
  });
}

export const useApproveRental = () =>
  useRentalMutation(({ id }) => RentalsService.approve(id));

export const useDeclineRental = () =>
  useRentalMutation(({ id, reason }) => RentalsService.decline(id, reason ?? ''));

export const useCancelRental = () =>
  useRentalMutation(({ id, reason }) => RentalsService.cancel(id, reason ?? ''));
