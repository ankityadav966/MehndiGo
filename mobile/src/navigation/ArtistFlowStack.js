import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useArtistOnboarding, determineArtistInitialRoute } from "../context/ArtistOnboardingContext";
import AadhaarVerificationScreen from "../screens/Artist/AadhaarVerificationScreen";
import ApprovalPendingScreen from "../screens/Artist/ApprovalPendingScreen";
import ApprovalRejectedScreen from "../screens/Artist/ApprovalRejectedScreen";
import BecomeArtistScreen from "../screens/Artist/BecomeArtistScreen";
import PersonalDetailsScreen from "../screens/Artist/PersonalDetailsScreen";
import ProfilePhotoScreen from "../screens/Artist/ProfilePhotoScreen";
import ReviewSubmitScreen from "../screens/Artist/ReviewSubmitScreen";
import KYCVerificationScreen from "../screens/Artist/KYCVerificationScreen";
import KycScreen from "../screens/Artist/KycScreen";
import PANVerificationScreen from "../screens/Artist/PANVerificationScreen";
import BankAccountManagementScreen from "../screens/Artist/BankAccountManagementScreen";
import ReuploadDocumentsScreen from "../screens/Artist/ReuploadDocumentsScreen";
import LeadDetailsScreen from "../screens/Artist/LeadDetailsScreen";
import BookingDetailsScreen from "../screens/Artist/BookingDetailsScreen";
import PortfolioScreen from "../screens/Customer/PortfolioScreen";
import EditProfileScreen from "../screens/Artist/EditProfileScreen";

const Stack = createNativeStackNavigator();

export default function ArtistFlowStack({ route }) {
  const { isProfileComplete, verificationStatus, artistDetails, aadhaarFiles, profilePhoto } = useArtistOnboarding();
  const requestedScreen = route?.params?.initialScreen;

  const initialRouteName = requestedScreen || determineArtistInitialRoute({
    verificationStatus,
    isProfileComplete,
    artistDetails,
    aadhaarFiles,
    profilePhoto,
  });

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="ApprovalPending" component={ApprovalPendingScreen} />
      <Stack.Screen name="ApprovalRejected" component={ApprovalRejectedScreen} />
      <Stack.Screen name="PersonalDetails" component={PersonalDetailsScreen} />
      <Stack.Screen name="ProfilePhoto" component={ProfilePhotoScreen} />
      <Stack.Screen
        name="AadhaarVerification"
        component={AadhaarVerificationScreen}
      />
      <Stack.Screen name="ReviewSubmit" component={ReviewSubmitScreen} />
      <Stack.Screen name="BecomeArtist" component={BecomeArtistScreen} />
      <Stack.Screen name="KYCVerification" component={KYCVerificationScreen} />
      <Stack.Screen name="Kyc" component={KycScreen} />
      <Stack.Screen name="PANVerification" component={PANVerificationScreen} />
      <Stack.Screen
        name="BankAccountManagement"
        component={BankAccountManagementScreen}
      />
      <Stack.Screen
        name="ReuploadDocuments"
        component={ReuploadDocumentsScreen}
      />
      <Stack.Screen name="LeadDetails" component={LeadDetailsScreen} />
      <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
      <Stack.Screen name="Portfolio" component={PortfolioScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    </Stack.Navigator>
  );
}
