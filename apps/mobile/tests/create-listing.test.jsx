import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import CreateListingScreen from '../src/app/asset/create';
import { apiClient } from '../src/services/api/client';

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('../src/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

function renderCreateListing() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <CreateListingScreen />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockRouter.back.mockClear();
  mockRouter.push.mockClear();
  apiClient.get.mockReset();
  apiClient.post.mockReset();
  ImagePicker.launchImageLibraryAsync.mockReset();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

test('blocks listing creation until identity is verified', async () => {
  apiClient.get.mockResolvedValueOnce({
    data: {
      id: 'user-1',
      fullName: 'Demo User',
      verificationStatus: 'NOT_STARTED',
    },
  });

  renderCreateListing();

  expect(await screen.findByText('Cần xác thực danh tính')).toBeTruthy();
  fireEvent.press(screen.getByText('Đi xác thực'));

  expect(mockRouter.push).toHaveBeenCalledWith('/profile/kyc');
  expect(apiClient.post).not.toHaveBeenCalled();
});

test('verified users can upload images and create a listing', async () => {
  apiClient.get
    .mockResolvedValueOnce({
      data: {
        id: 'user-1',
        fullName: 'Demo User',
        verificationStatus: 'VERIFIED',
      },
    })
    .mockResolvedValueOnce({
      data: [
        {
          id: 'cat-camera',
          name: 'Camera',
          children: [],
        },
      ],
    });
  apiClient.post
    .mockResolvedValueOnce({
      data: {
        url: 'https://cdn.example.com/asset.webp',
        fileKey: 'assets/user-1/asset.webp',
      },
    })
    .mockResolvedValueOnce({ data: { id: 'asset-1' } });
  ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
    canceled: false,
    assets: [
      {
        uri: 'file:///asset.jpg',
        fileName: 'asset.jpg',
        mimeType: 'image/jpeg',
      },
    ],
  });

  renderCreateListing();

  expect(await screen.findByText('Camera')).toBeTruthy();

  await act(async () => {
    fireEvent.press(screen.getByLabelText('Chọn ảnh tài sản'));
    const sourceOptions = Alert.alert.mock.calls.find(([title]) => title === 'Thêm ảnh')[2];
    await sourceOptions.find((option) => option.text === 'Chọn từ thư viện').onPress();
  });

  fireEvent.changeText(screen.getByPlaceholderText('Ví dụ: Máy ảnh Sony A7 IV'), 'Máy ảnh Sony A7 IV');
  fireEvent.changeText(
    screen.getByPlaceholderText('Tình trạng, phụ kiện đi kèm và lưu ý khi sử dụng'),
    'Máy hoạt động tốt, có pin và thẻ nhớ đi kèm.',
  );
  fireEvent.press(screen.getByText('Camera'));
  fireEvent.changeText(screen.getByPlaceholderText('150000'), '150000');
  fireEvent.changeText(screen.getByPlaceholderText('5000000'), '5000000');
  fireEvent.changeText(screen.getByPlaceholderText('Hồ Chí Minh'), 'Hồ Chí Minh');
  fireEvent.changeText(screen.getByPlaceholderText('Quận 1'), 'Quận 1');

  fireEvent.press(screen.getByText('Gửi duyệt bài đăng'));

  await waitFor(() => {
    expect(apiClient.post).toHaveBeenCalledWith('/assets', expect.objectContaining({
      categoryId: 'cat-camera',
      pricePerDay: 150000,
      estimatedValue: 5000000,
      deliveryOptions: ['PICKUP'],
      images: [expect.objectContaining({
        url: 'https://cdn.example.com/asset.webp',
        fileKey: 'assets/user-1/asset.webp',
        isCover: true,
        sortOrder: 0,
      })],
    }));
  });

  expect(apiClient.post).toHaveBeenCalledWith(
    '/assets/upload-image',
    expect.any(FormData),
    expect.objectContaining({
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30_000,
    }),
  );
  expect(mockRouter.back).toHaveBeenCalled();
});
