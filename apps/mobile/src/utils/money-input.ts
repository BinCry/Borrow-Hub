/** User-entered amounts are in thousand VND; API and database amounts remain in VND. */
export function parseThousandsVnd(input: string): number | null {
  const value = input.trim();
  if (!/^\d+(?:[,.]\d{1,3})?$/.test(value)) return null;
  const amount = Math.round(Number(value.replace(',', '.')) * 1_000);
  return Number.isSafeInteger(amount) ? amount : null;
}
