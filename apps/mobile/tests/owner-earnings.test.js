/* global test, expect */
import { buildOwnerEarnings } from '../src/services/finance/owner-earnings';

const payout = (status, netAmount, extras = {}) => ({
  id: `${status}-${netAmount}`,
  status,
  netAmount,
  createdAt: '2026-01-08T10:00:00.000Z',
  updatedAt: '2026-01-10T10:00:00.000Z',
  ...extras,
});

test('separates paid, upcoming and blocked amounts without counting cancelled payouts', () => {
  const overview = buildOwnerEarnings([
    payout('PAID', 100000, { paidAt: '2025-12-20T10:00:00.000Z' }),
    payout('PAID', 50000, { paidAt: '2026-01-09T10:00:00.000Z' }),
    payout('PENDING', 70000),
    payout('SCHEDULED', 30000, { scheduledAt: '2026-02-01T10:00:00.000Z' }),
    payout('BLOCKED', 40000),
    payout('CANCELLED', 20000),
  ], new Date('2026-02-15T10:00:00.000Z'), 3);

  expect(overview.paid).toBe(150000);
  expect(overview.paidCount).toBe(2);
  expect(overview.upcoming).toBe(100000);
  expect(overview.blocked).toBe(40000);
  expect(overview.months.map(({ key, paid }) => ({ key, paid }))).toEqual([
    { key: '2025-12', paid: 100000 },
    { key: '2026-01', paid: 50000 },
    { key: '2026-02', paid: 0 },
  ]);
});

test('keeps zero months and uses updated date for a paid payout lacking paidAt', () => {
  const overview = buildOwnerEarnings([
    payout('PAID', 120000, { paidAt: null, updatedAt: '2026-10-12T10:00:00.000Z' }),
  ], new Date('2026-10-18T10:00:00.000Z'), 6);

  expect(overview.months).toHaveLength(6);
  expect(overview.months.slice(0, 5).every((month) => month.paid === 0)).toBe(true);
  expect(overview.months[5].paid).toBe(120000);
});

test('pending-only payouts never appear in the revenue total or chart', () => {
  const overview = buildOwnerEarnings([
    payout('PENDING', 150000),
    payout('SCHEDULED', 30000, { scheduledAt: '2026-10-20T10:00:00.000Z' }),
  ], new Date('2026-10-18T10:00:00.000Z'));

  expect(overview.paid).toBe(0);
  expect(overview.paidCount).toBe(0);
  expect(overview.months.every((month) => month.paid === 0)).toBe(true);
  expect(overview.upcoming).toBe(180000);
});
