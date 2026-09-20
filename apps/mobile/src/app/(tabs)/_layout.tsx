import { Tabs } from 'expo-router';
import {
  CalendarClock,
  ClipboardCheck,
  Home,
  LayoutDashboard,
  MessageCircle,
  Megaphone,
  Search,
  User,
  WalletCards,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { apiClient } from '../../services/api/client';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import type { User as UserType } from '../../types/domain';
import { isStaffUser } from '../../utils/roles';

export default function TabLayout() {
  const tintColor = colors.primary.DEFAULT;
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [roleState, setRoleState] = useState<{
    token: string | null;
    user?: UserType;
  }>({ token: null });
  const isStaff =
    isAuthenticated &&
    Boolean(accessToken) &&
    roleState.token === accessToken &&
    isStaffUser(roleState.user);

  useEffect(() => {
    let isMounted = true;

    if (!isAuthenticated || !accessToken) {
      return;
    }

    apiClient
      .get<UserType>('/auth/me')
      .then((response) => {
        if (isMounted) {
          setRoleState({ token: accessToken, user: response.data });
        }
      })
      .catch(() => {
        if (isMounted) {
          setRoleState({ token: accessToken });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken, isAuthenticated]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tintColor,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          href: isStaff ? null : undefined,
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Khám phá',
          href: isStaff ? null : undefined,
          tabBarIcon: ({ color }) => <Search color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="rentals"
        options={{
          title: 'Đơn thuê',
          href: isStaff ? null : undefined,
          tabBarIcon: ({ color }) => <CalendarClock color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Tin nhắn',
          href: isStaff ? null : undefined,
          tabBarIcon: ({ color }) => <MessageCircle color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="admin-dashboard"
        options={{
          title: 'Tổng quan',
          href: isStaff ? undefined : null,
          tabBarIcon: ({ color }) => <LayoutDashboard color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="admin-moderation"
        options={{
          title: 'Kiểm duyệt',
          href: isStaff ? undefined : null,
          tabBarIcon: ({ color }) => <ClipboardCheck color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="admin-listings"
        options={{
          title: 'Thông báo',
          href: isStaff ? undefined : null,
          tabBarIcon: ({ color }) => <Megaphone color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="admin-operations"
        options={{
          title: 'Đơn/TC',
          href: isStaff ? undefined : null,
          tabBarIcon: ({ color }) => <CalendarClock color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="admin-finance"
        options={{
          title: 'Tài chính',
          href: null,
          tabBarIcon: ({ color }) => <WalletCards color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
