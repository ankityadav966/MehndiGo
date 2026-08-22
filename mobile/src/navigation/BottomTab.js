import Ionicons from "@expo/vector-icons/Ionicons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "../constants/Colors";

import DashboardScreen from "../screens/Artist/DashboardScreen";
import LeadsScreen from "../screens/Artist/LeadsScreen";
import ArtistProfileScreen from "../screens/Artist/ArtistProfileScreen";
import ArtistWalletScreen from "../screens/Artist/WalletScreen";
import BookingRequestsScreen from "../screens/Artist/BookingRequestsScreen";
import ProfileScreen from "../screens/Common/ProfileScreen";
import WalletScreen from "../screens/Common/WalletScreen";
import HomeScreen from "../screens/Customer/HomeScreen";
import MyBookingsScreen from "../screens/Customer/MyBookingsScreen";
import WishlistScreen from "../screens/Customer/WishlistScreen";
import CustomerProfileScreen from "@/screens/Customer/CustomerProfileScreen";
import ReelsScreen from "../screens/Customer/ReelsScreen";

const Tab = createBottomTabNavigator();

const customerRoutes = [
  {
    name: "Home",
    component: HomeScreen,
    icon: "home-outline",
    activeIcon: "home",
  },
  {
    name: "Reels",
    component: ReelsScreen,
    icon: "play-circle-outline",
    activeIcon: "play-circle",
  },
  {
    name: "Wishlist",
    component: WishlistScreen,
    icon: "heart-outline",
    activeIcon: "heart",
  },
  {
    name: "Bookings",
    component: MyBookingsScreen,
    icon: "calendar-outline",
    activeIcon: "calendar",
  },
  // {
  //   name: "Wallet",
  //   component: WalletScreen,
  //   icon: "wallet-outline",
  //   activeIcon: "wallet",
  // },
  {
    name: "Profile",
    component: CustomerProfileScreen,
    icon: "person-outline",
    activeIcon: "person",
  },
];

const artistRoutes = [
  {
    name: "Dashboard",
    component: DashboardScreen,
    icon: "grid-outline",
    activeIcon: "grid",
  },
  {
    name: "Leads",
    component: LeadsScreen,
    icon: "people-outline",
    activeIcon: "people",
  },
  {
    name: "Bookings",
    component: BookingRequestsScreen,
    icon: "calendar-outline",
    activeIcon: "calendar",
  },
  {
    name: "Wallet",
    component: ArtistWalletScreen,
    icon: "wallet-outline",
    activeIcon: "wallet",
  },
  {
    name: "Profile",
    component: ArtistProfileScreen,
    icon: "person-outline",
    activeIcon: "person",
  },
];

export default function BottomTab({ route }) {
  const insets = useSafeAreaInsets();
  const role = route?.params?.role || "customer";

  const routes = role === "artist" ? artistRoutes : customerRoutes;

  // Dynamic bottom spacing: floats above 3-button nav (~48px), gesture nav (~16-34px), or 12px fallback
  const bottomOffset = insets.bottom > 0 ? insets.bottom + 6 : 12;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,

        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: bottomOffset,
          height: 68,
          borderRadius: 20,
          backgroundColor: Colors.white,
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: Colors.text,
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },

        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginBottom: 6,
        },

        tabBarItemStyle: {
          paddingTop: 4,
        },
      }}
    >
      {routes.map((item) => (
        <Tab.Screen
          key={item.name}
          name={item.name}
          component={item.component}
          options={{
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? item.activeIcon : item.icon}
                size={24}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
