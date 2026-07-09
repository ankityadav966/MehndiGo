import { Tabs } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../theme/colors';
import { Home, CalendarHeart, Scissors, User } from 'lucide-react-native'; // Replaced Scissors with PenTool or just List/Settings, using Scissors for services for now

export default function ArtistLayout() {
  const { theme } = useAuth();
  const colors = Colors[theme];

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.bgSecondary },
        headerTintColor: colors.textPrimary,
        tabBarStyle: { backgroundColor: colors.bgSecondary, borderTopColor: colors.borderColor },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => <CalendarHeart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Services',
          tabBarIcon: ({ color, size }) => <Scissors size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
