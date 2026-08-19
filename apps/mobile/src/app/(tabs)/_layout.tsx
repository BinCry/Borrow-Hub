import { colors } from '../../theme/colors';
import { Tabs } from 'expo-router';
import { Home, Search, CalendarClock, MessageCircle, User } from 'lucide-react-native';

export default function TabLayout() {
  const tintColor = colors.primary.DEFAULT; // Primary color

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tintColor,
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Khám phá',
          tabBarIcon: ({ color }) => <Search color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="rentals"
        options={{
          title: 'Đơn thuê',
          tabBarIcon: ({ color }) => <CalendarClock color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Tin nhắn',
          tabBarIcon: ({ color }) => <MessageCircle color={color} size={24} />,
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
