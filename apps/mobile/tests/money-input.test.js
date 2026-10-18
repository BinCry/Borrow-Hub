/* global test, expect */
import { parseThousandsVnd } from '../src/utils/money-input';

test('converts thousand-VND entries to exact VND for APIs', () => {
  expect(parseThousandsVnd('150')).toBe(150000);
  expect(parseThousandsVnd('1,5')).toBe(1500);
  expect(parseThousandsVnd('1.25')).toBe(1250);
  expect(parseThousandsVnd('0,001')).toBe(1);
  expect(parseThousandsVnd(' 100 ')).toBe(100000);
});

test('rejects malformed or unsafe monetary entries', () => {
  for (const value of ['', '-1', '1,2345', '1,2,3', 'abc', '1 000', '999999999999999']) {
    expect(parseThousandsVnd(value)).toBeNull();
  }
});
