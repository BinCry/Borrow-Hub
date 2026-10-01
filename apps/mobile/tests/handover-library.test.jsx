import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { scanFromURLAsync } from 'expo-camera';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { Alert } from 'react-native';
import HandoverScreen from '../src/app/rental/[id]/handover';
import { apiClient } from '../src/services/api/client';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ id: 'rental-1' }),
}));
jest.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: () => [{ granted: false }, jest.fn()],
  scanFromURLAsync: jest.fn(),
}));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('../src/hooks/useRentals', () => ({
  useRental: () => ({ data: { ownerId: 'owner', status: 'READY_FOR_HANDOVER' } }),
}));
jest.mock('../src/services/api/client', () => ({ apiClient: { get: jest.fn(), post: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  apiClient.get.mockResolvedValue({ data: { id: 'renter' } });
  apiClient.post.mockResolvedValue({ data: {} });
  launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///qr.jpg' }] });
  scanFromURLAsync.mockResolvedValue([{ data: 'rentloop://handover/confirm?token=valid-token' }]);
});

async function openLibrary() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  render(<QueryClientProvider client={client}><HandoverScreen /></QueryClientProvider>);
  const button = await screen.findByText('Chọn ảnh QR từ thư viện');
  await act(async () => { fireEvent.press(button); });
}

test('confirms a library QR without camera permission', async () => {
  await openLibrary();
  await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/rentals/handover/qr/confirm', { token: 'valid-token' }));
  expect(scanFromURLAsync).toHaveBeenCalledWith('file:///qr.jpg', ['qr']);
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
});

test('canceling the picker leaves confirmation untouched and allows retry', async () => {
  launchImageLibraryAsync.mockResolvedValue({ canceled: true });
  await openLibrary();
  await screen.findByText('Chọn ảnh QR từ thư viện');
  expect(scanFromURLAsync).not.toHaveBeenCalled();
  expect(apiClient.post).not.toHaveBeenCalled();
});

test.each([[[]], [[{ data: 'one' }, { data: 'two' }]]])('does not confirm ambiguous or missing QR codes: %j', async (codes) => {
  scanFromURLAsync.mockResolvedValue(codes);
  await openLibrary();
  await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
  expect(apiClient.post).not.toHaveBeenCalled();
  expect(await screen.findByText('Chọn ảnh QR từ thư viện')).toBeTruthy();
});

test('a rejected token allows another image to be selected', async () => {
  apiClient.post.mockRejectedValueOnce(new Error('Expired'));
  await openLibrary();
  await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Mã không hợp lệ', expect.any(String)));
  const button = await screen.findByText('Chọn ảnh QR từ thư viện');
  await act(async () => { fireEvent.press(button); });
  await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(2));
});
