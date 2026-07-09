import { Tabs } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../theme/colors';
import { BarChart2, ShieldAlert, Users, Menu } from 'lucide-react-native';

export default function AdminLayout() {
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
          title: 'Overview',
          tabBarIcon: ({ color, size }) => <BarChart2 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pending"
        options={{
          title: 'Approvals',
          tabBarIcon: ({ color, size }) => <ShieldAlert size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Directory',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <Menu size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
