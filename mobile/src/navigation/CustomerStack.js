import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ChangePasswordScreen from "../screens/Common/ChangePasswordScreen";
import VideoPlayerScreen from "../screens/Common/VideoPlayerScreen";
import DeleteAccountScreen from "../screens/Common/DeleteAccountScreen";
import EditProfileScreen from "../screens/Common/EditProfileScreen";
import NotificationCenterScreen from "../screens/Common/NotificationCenterScreen";
import PrivacyPolicyScreen from "../screens/Common/PrivacyPolicyScreen";
import SettingsScreen from "../screens/Common/SettingsScreen";
import SupportScreen from "../screens/Common/SupportScreen";
import TermsConditionsScreen from "../screens/Common/TermsConditionsScreen";

import AddressSelection from "../screens/Customer/AddressSelection";
import ArtistListingScreen from "../screens/Customer/ArtistListingScreen";
import ArtistProfileScreen from "../screens/Customer/ArtistProfileScreen";
import BookingCancellationScreen from "../screens/Customer/BookingCancellationScreen";
import BookingDetailsScreen from "../screens/Customer/BookingDetailsScreen";
import BookingSettlementScreen from "../screens/Customer/BookingSettlementScreen";
import BookingSuccessScreen from "../screens/Customer/BookingSuccessScreen";
import BookingSummaryScreen from "../screens/Customer/BookingSummaryScreen";
import CategoriesScreen from "../screens/Customer/CategoriesScreen";
import ContactSupportScreen from "../screens/Customer/ContactSupportScreen";
import CouponsScreen from "../screens/Customer/CouponsScreen";
import LiveTrackingScreen from "../screens/Customer/LiveTrackingScreen";
import MyBookingsScreen from "../screens/Customer/MyBookingsScreen";
import NotificationDetailsScreen from "../screens/Customer/NotificationDetailsScreen";
import PaymentFailedScreen from "../screens/Customer/PaymentFailedScreen";
import PaymentScreen from "../screens/Customer/PaymentScreen";
import PortfolioScreen from "../screens/Customer/PortfolioScreen";
import RefundStatusScreen from "../screens/Customer/RefundStatusScreen";
import ReviewSubmissionScreen from "../screens/Customer/ReviewSubmissionScreen";
import ReviewsScreen from "../screens/Customer/ReviewsScreen";
import SearchScreen from "../screens/Customer/SearchScreen";
import SelectDateScreen from "../screens/Customer/SelectDateScreen";
import SelectService from "../screens/Customer/SelectService";
import SelectTimeSlotScreen from "../screens/Customer/SelectTimeSlotScreen";
import ReferralDashboardScreen from "../screens/Customer/ReferralDashboardScreen";
import LeaderboardScreen from "../screens/Customer/LeaderboardScreen";
import RewardStoreScreen from "../screens/Customer/RewardStoreScreen";
import SupportTicketScreen from "../screens/Customer/SupportTicketScreen";
import SupportTicketDetailsScreen from "../screens/Common/SupportTicketDetailsScreen";

import BottomTab from "./BottomTab";
import ChatListScreen from "../screens/Common/ChatListScreen";
import ChatRoomScreen from "../screens/Common/ChatRoomScreen";

const Stack = createNativeStackNavigator();

export default function CustomerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CustomerTabs" component={BottomTab} initialParams={{ role: "customer" }} />
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Stack.Screen name="RewardStore" component={RewardStoreScreen} />
      <Stack.Screen name="ArtistProfile" component={ArtistProfileScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Categories" component={CategoriesScreen} />
      <Stack.Screen name="ArtistListing" component={ArtistListingScreen} />
      <Stack.Screen name="SelectService" component={SelectService} />
      <Stack.Screen name="SelectDate" component={SelectDateScreen} />
      <Stack.Screen name="Portfolio" component={PortfolioScreen} />
      <Stack.Screen name="BookingSummary" component={BookingSummaryScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="SelectTimeSlot" component={SelectTimeSlotScreen} />
      <Stack.Screen name="AddressSelection" component={AddressSelection} />
      <Stack.Screen name="BookingSuccess" component={BookingSuccessScreen} />
      <Stack.Screen name="LiveTracking" component={LiveTrackingScreen} />
      <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
      <Stack.Screen name="Coupons" component={CouponsScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
      <Stack.Screen name="BookingSettlement" component={BookingSettlementScreen} />
      <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} />
      <Stack.Screen name="NotificationDetails" component={NotificationDetailsScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsConditions" component={TermsConditionsScreen} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
      <Stack.Screen name="BookingCancellation" component={BookingCancellationScreen} />
      <Stack.Screen name="ContactSupport" component={ContactSupportScreen} />
      <Stack.Screen name="ReviewSubmission" component={ReviewSubmissionScreen} />
      <Stack.Screen name="Reviews" component={ReviewsScreen} />
      <Stack.Screen name="RefundStatus" component={RefundStatusScreen} />
      <Stack.Screen name="PaymentFailed" component={PaymentFailedScreen} />
      <Stack.Screen name="ReferralDashboard" component={ReferralDashboardScreen} />
      <Stack.Screen name="SupportTicket" component={SupportTicketScreen} />
      <Stack.Screen name="SupportTicketDetails" component={SupportTicketDetailsScreen} />
      <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} />
    </Stack.Navigator>
  );
}
