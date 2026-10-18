import type { AdminPayment } from '../admin/admin.service';

// A renter payment is kept off the finance payment list while its owner payout awaits processing.
// The payout remains available in the separate "Chi trả" tab so staff can mark it PAID.
export function visibleFinancePayments(payments: AdminPayment[]): AdminPayment[] {
  return payments.filter((payment) => {
    const status = payment.rental.payout?.status;
    return status !== 'PENDING' && status !== 'SCHEDULED';
  });
}
