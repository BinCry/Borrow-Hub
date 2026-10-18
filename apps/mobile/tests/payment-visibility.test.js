/* global test, expect */
import { visibleFinancePayments } from '../src/services/finance/payment-visibility';

const payment = (id, status) => ({
  id,
  rental: { payout: status ? { status } : null },
});

test('hides payouts waiting to be paid from the finance payment list', () => {
  expect(visibleFinancePayments([
    payment('pending', 'PENDING'),
    payment('scheduled', 'SCHEDULED'),
    payment('paid', 'PAID'),
    payment('blocked', 'BLOCKED'),
    payment('without-payout', null),
  ]).map((item) => item.id)).toEqual(['paid', 'blocked', 'without-payout']);
});

test('shows the same order after its payout becomes paid', () => {
  const item = payment('rental-1', 'PENDING');
  expect(visibleFinancePayments([item])).toHaveLength(0);
  item.rental.payout.status = 'PAID';
  expect(visibleFinancePayments([item])).toHaveLength(1);
});
