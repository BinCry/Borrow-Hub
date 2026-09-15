import { Stack, router, useLocalSearchParams } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import TabLayout from '../src/app/(tabs)/_layout';
import RentalsScreen from '../src/app/(tabs)/rentals';
import { useRentals } from '../src/hooks/useRentals';
import { useAuthStore } from '../src/store/authStore';

jest.mock('../src/hooks/useRentals', () => ({ useRentals: jest.fn() }));
jest.mock('../src/store/authStore', () => ({ useAuthStore: jest.fn() }));

const labels = { renter: '\u0110i thu\u00ea', owner: 'Cho thu\u00ea' };
const refetch = jest.fn();
const logout = jest.fn().mockResolvedValue(undefined);
let authenticated;
let queryState;
let log;

function DetailScreen() {
  const { id } = useLocalSearchParams();
  return <Text>{`Rental detail: ${id}`}</Text>;
}

function renderRentals() {
  return renderRouter({
    _layout: () => <Stack screenOptions={{ headerShown: false, animation: 'none' }} />,
    '(tabs)/_layout': TabLayout,
    '(tabs)/index': () => <Text>Home screen</Text>,
    '(tabs)/discover': () => <Text>Discover screen</Text>,
    '(tabs)/rentals': RentalsScreen,
    '(tabs)/messages': () => <Text>Messages screen</Text>,
    '(tabs)/admin-dashboard': () => <Text>Admin dashboard screen</Text>,
    '(tabs)/admin-moderation': () => <Text>Admin moderation screen</Text>,
    '(tabs)/admin-operations': () => <Text>Admin operations screen</Text>,
    '(tabs)/admin-finance': () => <Text>Admin finance screen</Text>,
    '(tabs)/profile': () => <Text>Profile screen</Text>,
    'rental/[id]': DetailScreen,
    'asset/create': () => <Text>Create listing screen</Text>,
    'auth/login': () => <Text>Login screen</Text>,
  }, { initialUrl: '/rentals' });
}

beforeEach(() => {
  authenticated = true;
  queryState = {};
  refetch.mockClear();
  logout.mockClear();
  log = jest.spyOn(console, 'log').mockImplementation(() => {});
  useAuthStore.mockImplementation((selector) => selector({
    isAuthenticated: authenticated,
    logout,
  }));
  useRentals.mockImplementation((role) => ({
    data: { data: [{
      id: `${role}-rental`,
      status: 'PENDING_OWNER',
      asset: { title: `${role} asset` },
      owner: { fullName: 'Owner' },
      renter: { fullName: 'Renter' },
    }] },
    isLoading: false,
    isError: false,
    isRefetching: false,
    refetch,
    ...queryState,
  }));
});

function expectNoInteropUpgrades() {
  expect(log.mock.calls.filter(([message]) =>
    typeof message === 'string' && message.includes('CssInterop upgrade warning'),
  )).toEqual([]);
}

test('switching to owner does not add a CSS context after mount', () => {
  renderRentals();
  expect(screen.getByText('renter asset')).toBeTruthy();
  fireEvent.press(screen.getByText(labels.owner));
  expect(screen.getByText('owner asset')).toBeTruthy();
  expectNoInteropUpgrades();
});

test('owner role exposes the create listing shortcut', () => {
  renderRentals();
  expect(screen.queryByLabelText('Tạo bài đăng cho thuê')).toBeNull();
  fireEvent.press(screen.getByText(labels.owner));
  fireEvent.press(screen.getByLabelText('Tạo bài đăng cho thuê'));
  expect(screen).toHavePathname('/asset/create');
  expect(screen.getByText('Create listing screen')).toBeTruthy();
  expectNoInteropUpgrades();
});

test('repeated role switches still allow opening an order and returning to the tab', () => {
  renderRentals();
  for (let index = 0; index < 20; index += 1) {
    fireEvent.press(screen.getByText(labels.owner));
    expect(screen.getByText('owner asset')).toBeTruthy();
    fireEvent.press(screen.getByText(labels.renter));
    expect(screen.getByText('renter asset')).toBeTruthy();
  }
  fireEvent.press(screen.getByText(labels.owner));
  fireEvent.press(screen.getByText('owner asset'));
  expect(screen).toHavePathname('/rental/owner-rental');
  expect(screen.getByText('Rental detail: owner-rental')).toBeTruthy();
  act(() => router.back());
  expect(screen).toHavePathname('/rentals');
  expect(screen.getByText('owner asset')).toBeTruthy();
  act(() => router.navigate('/'));
  expect(screen.getByText('Home screen')).toBeTruthy();
  act(() => router.navigate('/rentals'));
  expect(screen.getByText('owner asset')).toBeTruthy();
  expectNoInteropUpgrades();
});

test.each([
  ['loading', { data: undefined, isLoading: true }],
  ['empty', { data: { data: [] } }],
  ['network error', { data: undefined, isError: true, error: new Error('Network Error') }],
])('role switches work while showing %s', (_name, state) => {
  queryState = state;
  renderRentals();
  for (let index = 0; index < 5; index += 1) {
    fireEvent.press(screen.getByText(labels.owner));
    expect(useRentals).toHaveBeenLastCalledWith('owner', true);
    fireEvent.press(screen.getByText(labels.renter));
    expect(useRentals).toHaveBeenLastCalledWith('renter', true);
  }
  expectNoInteropUpgrades();
});

test('signed-out users can switch roles without enabling private queries', () => {
  authenticated = false;
  renderRentals();
  fireEvent.press(screen.getByText(labels.owner));
  expect(useRentals).toHaveBeenLastCalledWith('owner', false);
  expect(screen.queryByText('owner asset')).toBeNull();
  fireEvent.press(screen.getByText(labels.renter));
  expect(useRentals).toHaveBeenLastCalledWith('renter', false);
  expectNoInteropUpgrades();
});
