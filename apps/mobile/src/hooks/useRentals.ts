import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RentalsService } from '../services';

export const useRentals = (role: 'renter' | 'owner') => {
  return useQuery({
    queryKey: ['rentals', 'list', role],
    queryFn: () => RentalsService.getMyRentals(role),
  });
};

export const useRental = (id: string) => {
  return useQuery({
    queryKey: ['rentals', 'detail', id],
    queryFn: () => RentalsService.getById(id),
    enabled: !!id,
  });
};

export const useCreateRental = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => RentalsService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals', 'list'] });
    },
  });
};

export const useApproveRental = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => RentalsService.approve(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rentals', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['rentals', 'list'] });
    },
  });
};

export const useDeclineRental = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => RentalsService.decline(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['rentals', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['rentals', 'list'] });
    },
  });
};
