import type { OwnerPayout } from './owner-finance.service';

export type EarningsMonth = {
  key: string;
  label: string;
  paid: number;
};

export type EarningsOverview = {
  paid: number;
  upcoming: number;
  blocked: number;
  paidCount: number;
  months: EarningsMonth[];
};

function validDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function buildOwnerEarnings(payouts: OwnerPayout[], now = new Date(), monthCount = 6): EarningsOverview {
  const months = Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - monthCount + index + 1, 1);
    return {
      key: monthKey(date),
      label: `T${date.getMonth() + 1}/${String(date.getFullYear()).slice(-2)}`,
      paid: 0,
    };
  });
  const byMonth = new Map(months.map((month) => [month.key, month]));
  const overview = { paid: 0, upcoming: 0, blocked: 0, paidCount: 0, months };

  for (const payout of payouts) {
    const amount = Number(payout.netAmount);
    if (!Number.isFinite(amount) || amount < 0) continue;

    if (payout.status === 'PAID') {
      overview.paid += amount;
      overview.paidCount += 1;
      const date = validDate(payout.paidAt) ?? validDate(payout.updatedAt);
      if (date) {
        const month = byMonth.get(monthKey(date));
        if (month) month.paid += amount;
      }
    } else if (payout.status === 'PENDING' || payout.status === 'SCHEDULED') {
      overview.upcoming += amount;
    } else if (payout.status === 'BLOCKED') {
      overview.blocked += amount;
    }
  }

  return overview;
}
