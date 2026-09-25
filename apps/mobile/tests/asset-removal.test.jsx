/* global jest, beforeEach, test, expect */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AssetDetailScreen from '../src/app/asset/[id]';
import AdminListingsScreen from '../src/app/admin/listings';
import { apiClient } from '../src/services/api/client';
import { synchronizeRemovedAsset } from '../src/utils/assetCache';
import { AdminService } from '../src/services/admin/admin.service';

const mockRouter = { back: jest.fn(), push: jest.fn() };
const mockAsset = {
  id: 'asset-1', ownerId: 'owner-1', title: 'Camera', status: 'ACTIVE',
  description: 'Camera test', images: [], pricePerDay: 100000,
  location: { city: 'Hồ Chí Minh', district: 'Quận 1' },
};
let mockUser;
let mockListings;

const missingDeleteRoute = {
  isAxiosError: true,
  response: { status: 404, data: { success: false, error: {
    code: 'NotFoundException', message: 'Cannot DELETE /api/v1/assets/asset-1',
  } } },
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ id: 'asset-1', admin: '1' }),
}));
jest.mock('../src/hooks/useAssets', () => ({
  useAsset: () => ({ data: mockAsset, isLoading: false, isError: false }),
}));
jest.mock('../src/store/authStore', () => ({
  useAuthStore: () => ({ isAuthenticated: true }),
}));
jest.mock('../src/services/api/client', () => ({
  apiClient: { get: jest.fn(), delete: jest.fn(), patch: jest.fn() },
}));

function makeClient() {
  return new QueryClient({ defaultOptions: {
    queries: { retry: false, gcTime: Infinity },
    mutations: { retry: false, gcTime: Infinity },
  } });
}

function renderScreen(Component) {
  const client = makeClient();
  client.setQueryData(['my-assets'], [mockAsset]);
  client.setQueryData(['assets', 'list', {}], {
    data: [mockAsset], meta: { total: 1, page: 1, limit: 20, totalPages: 1, hasNextPage: false },
  });
  render(<QueryClientProvider client={client}><Component /></QueryClientProvider>);
  return client;
}

async function confirmDeletion() {
  const buttons = Alert.alert.mock.calls.findLast(([title]) => title === 'Xóa bài đăng?')[2];
  await act(async () => { await buttons.find((button) => button.text === 'Xóa bài').onPress(); });
}

beforeEach(() => {
  jest.clearAllMocks();
  apiClient.delete.mockReset();
  apiClient.patch.mockReset();
  mockUser = { id: 'owner-1', fullName: 'Owner', roles: ['USER'] };
  mockListings = [mockAsset];
  apiClient.get.mockImplementation(async (url) => {
    if (url === '/auth/me') return { data: mockUser };
    if (url === '/assets') return { data: {
      data: mockListings,
      pagination: { total: mockListings.length, page: 1, limit: 50, totalPages: mockListings.length ? 1 : 0 },
    } };
    throw new Error(`Unexpected GET ${url}`);
  });
  apiClient.delete.mockResolvedValue({ data: { ...mockAsset, status: 'ARCHIVED' } });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

test('owner deletes their own listing without an admin role or a reason', async () => {
  const client = renderScreen(AssetDetailScreen);
  fireEvent.press(await screen.findByLabelText('Xóa bài đăng'));
  expect(screen.queryByLabelText('Lý do xóa bài')).toBeNull();
  expect(screen.queryByText('Yêu cầu thuê ngay')).toBeNull();
  await confirmDeletion();
  expect(apiClient.delete).toHaveBeenCalledWith('/assets/asset-1', { data: {} });
  expect(apiClient.patch).not.toHaveBeenCalled();
  expect(client.getQueryData(['my-assets'])).toEqual([]);
  expect(client.getQueryData(['assets', 'list', {}]).data).toEqual([]);
  expect(Alert.alert).toHaveBeenCalledWith('Đã xóa bài', expect.any(String), expect.any(Array));
});

test.each([['USER'], ['CUSTOMER_SUPPORT'], ['DISPUTE_OFFICER']])(
  'route parameter admin=1 does not grant deletion rights to %s', async (role) => {
    mockUser = { id: 'other-1', roles: [role] };
    const client = renderScreen(AssetDetailScreen);
    await waitFor(() => expect(client.getQueryData(['me'])).toEqual(mockUser));
    expect(screen.queryByLabelText('Xóa bài đăng')).toBeNull();
  },
);

test.each(['ADMIN', 'MODERATOR'])('%s deletes from detail with a required reason', async (role) => {
  mockUser = { id: 'staff-1', roles: [role] };
  renderScreen(AssetDetailScreen);
  fireEvent.press(await screen.findByLabelText('Xóa bài đăng'));
  expect(Alert.alert).toHaveBeenCalledWith('Cần lý do xóa bài', expect.any(String));
  expect(apiClient.delete).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText('Lý do xóa bài'), '  Sai thông tin  ');
  fireEvent.press(screen.getByLabelText('Xóa bài đăng'));
  await confirmDeletion();
  expect(apiClient.delete).toHaveBeenCalledWith('/assets/asset-1', { data: { reason: 'Sai thông tin' } });
});

test('failed deletion preserves the listing and displays the server error', async () => {
  apiClient.delete.mockRejectedValueOnce({ isAxiosError: true, response: { status: 401, data: { success: false, error: { message: 'Phiên đăng nhập đã hết hạn.' } } } });
  const client = renderScreen(AssetDetailScreen);
  fireEvent.press(await screen.findByLabelText('Xóa bài đăng'));
  await confirmDeletion();
  expect(client.getQueryData(['my-assets'])).toEqual([mockAsset]);
  expect(Alert.alert).toHaveBeenCalledWith('Không thể xóa bài', 'Phiên đăng nhập đã hết hạn.');
});

test.each(['current', 'legacy'])('admin queue deletes and refreshes against the %s API', async (version) => {
  const finishRemoval = async () => {
    mockListings = [];
    return { data: { ...mockAsset, status: 'ARCHIVED' } };
  };
  if (version === 'legacy') {
    apiClient.delete.mockRejectedValueOnce(missingDeleteRoute);
    apiClient.patch.mockImplementationOnce(finishRemoval);
  } else {
    apiClient.delete.mockImplementationOnce(finishRemoval);
  }
  renderScreen(AdminListingsScreen);
  await screen.findByText('Camera');
  fireEvent.changeText(screen.getByPlaceholderText('Lý do xóa bài'), 'Sai thông tin');
  fireEvent.press(screen.getByText('Xóa bài'));
  await confirmDeletion();
  await waitFor(() => expect(screen.queryByText('Camera')).toBeNull());
  fireEvent.press(screen.getByLabelText('Tải lại'));
  await waitFor(() => expect(screen.getByText('0 bài đăng')).toBeTruthy());
  expect(apiClient.delete).toHaveBeenCalledWith('/assets/asset-1', { data: { reason: 'Sai thông tin' } });
  if (version === 'legacy') {
    expect(apiClient.patch).toHaveBeenCalledWith('/assets/asset-1/moderate', { status: 'ARCHIVED', reason: 'Sai thông tin' });
  } else {
    expect(apiClient.patch).not.toHaveBeenCalled();
  }
});

test('admin detail deletes through moderation when the server lacks DELETE', async () => {
  mockUser = { id: 'admin-1', roles: ['ADMIN'] };
  apiClient.delete.mockRejectedValueOnce(missingDeleteRoute);
  apiClient.patch.mockResolvedValueOnce({ data: { ...mockAsset, status: 'ARCHIVED' } });
  const client = renderScreen(AssetDetailScreen);
  fireEvent.changeText(await screen.findByLabelText('Lý do xóa bài'), 'Sai thông tin');
  fireEvent.press(screen.getByLabelText('Xóa bài đăng'));
  await confirmDeletion();
  expect(apiClient.patch).toHaveBeenCalledWith('/assets/asset-1/moderate', { status: 'ARCHIVED', reason: 'Sai thông tin' });
  expect(client.getQueryData(['my-assets'])).toEqual([]);
  expect(Alert.alert).toHaveBeenCalledWith('Đã xóa bài', expect.any(String), expect.any(Array));
});

test.each([
  [403, 'Bạn không có quyền xóa bài đăng này.'],
  [404, 'Asset not found'],
  [500, 'Internal server error'],
  [undefined, undefined],
])('admin does not try moderation for a %s deletion failure', async (status, message) => {
  const error = { isAxiosError: true, ...(status ? { response: { status, data: { error: { message } } } } : {}) };
  apiClient.delete.mockRejectedValueOnce(error);
  await expect(AdminService.removeAsset('asset-1', 'Sai thông tin')).rejects.toBe(error);
  expect(apiClient.patch).not.toHaveBeenCalled();
});

test('owner never calls the admin fallback when DELETE is unavailable', async () => {
  apiClient.delete.mockRejectedValueOnce(missingDeleteRoute);
  const client = renderScreen(AssetDetailScreen);
  fireEvent.press(await screen.findByLabelText('Xóa bài đăng'));
  await confirmDeletion();
  expect(apiClient.patch).not.toHaveBeenCalled();
  expect(client.getQueryData(['my-assets'])).toEqual([mockAsset]);
  expect(Alert.alert).toHaveBeenCalledWith('Không thể xóa bài', expect.stringContaining('chưa khả dụng trên máy chủ'));
});

test('a list request started before deletion cannot put the deleted asset back', async () => {
  const client = makeClient();
  const key = ['assets', 'list', {}];
  const otherAsset = { ...mockAsset, id: 'asset-2' };
  const page = { data: [mockAsset, otherAsset], meta: { total: 2, page: 1, limit: 20, totalPages: 1, hasNextPage: false } };
  client.setQueryData(key, page);
  client.setQueryData(['admin', 'listings', 'ALL'], { data: page.data, pagination: page.meta });
  client.setQueryData(['assets', 'detail', 'asset-1'], mockAsset);
  let finishOldRequest;
  const oldRequest = client.fetchQuery({ queryKey: key, queryFn: () => new Promise((resolve) => { finishOldRequest = resolve; }) }).catch(() => undefined);
  await synchronizeRemovedAsset(client, 'asset-1');
  finishOldRequest(page);
  await oldRequest;
  expect(client.getQueryData(key).data).toEqual([otherAsset]);
  expect(client.getQueryData(key).meta.total).toBe(1);
  expect(client.getQueryData(['admin', 'listings', 'ALL']).data).toEqual([otherAsset]);
  expect(client.getQueryData(['admin', 'listings', 'ALL']).pagination.total).toBe(1);
  expect(client.getQueryData(['assets', 'detail', 'asset-1']).status).toBe('ARCHIVED');
  await synchronizeRemovedAsset(client, 'asset-1');
  expect(client.getQueryData(key).meta.total).toBe(1);
});
