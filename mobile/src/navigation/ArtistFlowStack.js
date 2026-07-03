import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useArtistOnboarding } from "../context/ArtistOnboardingContext";
import AadhaarVerificationScreen from "../screens/Artist/AadhaarVerificationScreen";
import ApprovalPendingScreen from "../screens/Artist/ApprovalPendingScreen";
import BecomeArtistScreen from "../screens/Artist/BecomeArtistScreen";
import PersonalDetailsScreen from "../screens/Artist/PersonalDetailsScreen";
import ProfilePhotoScreen from "../screens/Artist/ProfilePhotoScreen";
import ReviewSubmitScreen from "../screens/Artist/ReviewSubmitScreen";
import LeadDetailsScreen from "../screens/Artist/LeadDetailsScreen";
import BookingDetailsScreen from "../screens/Artist/BookingDetailsScreen";
import PortfolioScreen from "../screens/Customer/PortfolioScreen";
import EditProfileScreen from "../screens/Artist/EditProfileScreen";

const Stack = createNativeStackNavigator();

export default function ArtistFlowStack({ route }) {
  const { artistProfileCompleted, artistApproved } = useArtistOnboarding();
  const requestedScreen = route?.params?.initialScreen;

  const initialRouteName = requestedScreen
    ? requestedScreen
    : !artistProfileCompleted
      ? "BecomeArtist"
      : !artistApproved
        ? "ApprovalPending"
        : "BecomeArtist";

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="BecomeArtist" component={BecomeArtistScreen} />
      <Stack.Screen name="PersonalDetails" component={PersonalDetailsScreen} />
      <Stack.Screen name="ProfilePhoto" component={ProfilePhotoScreen} />
      <Stack.Screen
        name="AadhaarVerification"
        component={AadhaarVerificationScreen}
      />
      <Stack.Screen name="ReviewSubmit" component={ReviewSubmitScreen} />
      <Stack.Screen name="ApprovalPending" component={ApprovalPendingScreen} />
      <Stack.Screen name="LeadDetails" component={LeadDetailsScreen} />
      <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
      <Stack.Screen name="Portfolio" component={PortfolioScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    </Stack.Navigator>
  );
}
