/* global test, expect */
import { getApiErrorMessage, isMissingApiRoute } from '../src/utils/apiError';

test.each([
  [{ error: { message: 'Không có quyền xóa bài.' } }, 'Không có quyền xóa bài.'],
  [{ error: { message: ['Thiếu lý do.', 'Lý do quá dài.'] } }, 'Thiếu lý do.\nLý do quá dài.'],
  [{ message: 'Lỗi từ API cũ.' }, 'Lỗi từ API cũ.'],
])('reads the actual API error envelope: %j', (data, expected) => {
  expect(getApiErrorMessage({ isAxiosError: true, response: { status: 400, data } }, 'Fallback')).toBe(expected);
});

test('recognizes the exact missing DELETE route returned by the deployed API', () => {
  const error = { isAxiosError: true, response: { status: 404, data: { success: false, error: {
    code: 'NotFoundException', message: 'Cannot DELETE /api/v1/assets/asset-1',
  } } } };
  expect(isMissingApiRoute(error, 'DELETE', '/assets/asset-1')).toBe(true);
  expect(isMissingApiRoute(error, 'DELETE', '/assets/asset-2')).toBe(false);
  expect(isMissingApiRoute(error, 'PATCH', '/assets/asset-1')).toBe(false);
  expect(getApiErrorMessage(error, 'Kiểm tra kết nối')).toContain('chưa khả dụng trên máy chủ');
});

test('distinguishes server and timeout failures from a connectivity fallback', () => {
  expect(getApiErrorMessage({ isAxiosError: true, response: { status: 502 } }, 'Kết nối')).toContain('Máy chủ đang gặp lỗi');
  expect(getApiErrorMessage({ isAxiosError: true, code: 'ECONNABORTED' }, 'Kết nối')).toContain('phản hồi quá lâu');
});
