/* global test, expect */
import { getStatusLabel, getPaymentMethodLabel, getDeliveryMethodLabel } from '../src/utils/status-labels';

test.each([
  ['BLOCKED', 'Đã tạm khóa'],
  ['DISPUTED', 'Đang tranh chấp'],
  ['RENTAL', 'Đơn thuê'],
  ['SUPER_ADMIN', 'Quản trị viên cấp cao'],
  ['REVIEW_REQUIRED', 'Cần đối chiếu'],
])('renders %s as a Vietnamese label', (value, expected) => {
  expect(getStatusLabel(value)).toBe(expected);
});

test('handles missing and new internal codes without exposing raw enums', () => {
  expect(getStatusLabel(null)).toBe('Không có');
  expect(getStatusLabel('NEW_INTERNAL_STATUS')).toBe('Chưa xác định');
});

test('uses delivery-specific wording rather than handover event wording', () => {
  expect(getStatusLabel('DELIVERY')).toBe('Bàn giao');
  expect(getDeliveryMethodLabel('DELIVERY')).toBe('Giao hàng');
  expect(getDeliveryMethodLabel('BOTH')).toBe('Nhận trực tiếp hoặc giao hàng');
});

test('localizes payment methods', () => {
  expect(getPaymentMethodLabel('SEPAY')).toBe('Chuyển khoản ngân hàng');
  expect(getPaymentMethodLabel('SANDBOX')).toBe('Thanh toán thử nghiệm');
  expect(getPaymentMethodLabel('BANK_TRANSFER')).toBe('Chuyển khoản ngân hàng');
});
