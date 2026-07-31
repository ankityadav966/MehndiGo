import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ChangePasswordScreen from "../screens/Common/ChangePasswordScreen";
import VideoPlayerScreen from "../screens/Common/VideoPlayerScreen";
import DeleteAccountScreen from "../screens/Common/DeleteAccountScreen";
import EditProfileScreen from "../screens/Common/EditProfileScreen";
import NotificationCenterScreen from "../screens/Common/NotificationCenterScreen";
import PrivacyPolicyScreen from "../screens/Common/PrivacyPolicyScreen";
import SettingsScreen from "../screens/Common/SettingsScreen";
import TermsConditionsScreen from "../screens/Common/TermsConditionsScreen";

import AddPortfolioScreen from "../screens/Artist/AddPortfolioScreen";
import ArtistProfileScreen from "../screens/Artist/ArtistProfileScreen";
import BookingDetailsScreen from "../screens/Artist/BookingDetailsScreen";
import EditPortfolioScreen from "../screens/Artist/EditPortfolioScreen";
import KycScreen from "../screens/Artist/KycScreen";
import LeadDetailsScreen from "../screens/Artist/LeadDetailsScreen";
import NotificationDetailsScreen from "../screens/Artist/NotificationDetailsScreen";
import PortfolioDetailScreen from "../screens/Artist/PortfolioDetailScreen";
import PortfolioScreen from "../screens/Artist/PortfolioScreen";
import ProfileScreen from "../screens/Artist/ProfileScreen";
import PublicProfileScreen from "../screens/Artist/PublicProfileScreen";
import TransactionsScreen from "../screens/Artist/TransactionsScreen";
import WalletScreen from "../screens/Artist/WalletScreen";
import WithdrawEarningsScreen from "../screens/Artist/WithdrawEarningsScreen";

import BookingRequestsScreen from "../screens/Artist/BookingRequestsScreen";
import ReviewsScreen from "../screens/Artist/ReviewsScreen";
import NotificationsScreen from "../screens/Artist/NotificationsScreen";
import SupportScreen from "../screens/Common/SupportScreen";
import AvailabilityCalendarScreen from "../screens/Artist/AvailabilityCalendarScreen";
import ServicesScreen from "../screens/Artist/ServicesScreen";
import AddServiceScreen from "../screens/Artist/AddServiceScreen";
import EditServiceScreen from "../screens/Artist/EditServiceScreen";
import ServiceDetailsScreen from "../screens/Artist/ServiceDetailsScreen";
import SupportTicketScreen from "../screens/Customer/SupportTicketScreen";
import SupportTicketDetailsScreen from "../screens/Common/SupportTicketDetailsScreen";

import BottomTab from "./BottomTab";
import ChatListScreen from "../screens/Common/ChatListScreen";
import ChatRoomScreen from "../screens/Common/ChatRoomScreen";

const Stack = createNativeStackNavigator();

export default function ArtistStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, freezeOnBlur: true, animation: "slide_from_right" }}>
      <Stack.Screen name="ArtistTabs" component={BottomTab} initialParams={{ role: "artist" }} />
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
      <Stack.Screen name="LeadDetails" component={LeadDetailsScreen} />
      <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
      <Stack.Screen name="Portfolio" component={PortfolioScreen} />
      <Stack.Screen name="AddPortfolio" component={AddPortfolioScreen} />
      <Stack.Screen name="PortfolioDetail" component={PortfolioDetailScreen} />
      <Stack.Screen name="EditPortfolio" component={EditPortfolioScreen} />
      <Stack.Screen name="ArtistProfile" component={ArtistProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Kyc" component={KycScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="Transactions" component={TransactionsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="WithdrawEarnings" component={WithdrawEarningsScreen} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} />
      <Stack.Screen name="NotificationDetails" component={NotificationDetailsScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsConditions" component={TermsConditionsScreen} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
      <Stack.Screen name="BookingRequests" component={BookingRequestsScreen} />
      <Stack.Screen name="Reviews" component={ReviewsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="AvailabilityCalendar" component={AvailabilityCalendarScreen} />
      <Stack.Screen name="Services" component={ServicesScreen} />
      <Stack.Screen name="AddService" component={AddServiceScreen} />
      <Stack.Screen name="EditService" component={EditServiceScreen} />
      <Stack.Screen name="ServiceDetails" component={ServiceDetailsScreen} />
      <Stack.Screen name="SupportTicket" component={SupportTicketScreen} />
      <Stack.Screen name="SupportTicketDetails" component={SupportTicketDetailsScreen} />
      <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} />
    </Stack.Navigator>
  );
}
