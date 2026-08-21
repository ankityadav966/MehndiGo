import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { secureStorage } from "../utils/storage";
import { getArtistDetails } from "../services/artist";
import { useAuth } from "./AuthContext";

const ArtistOnboardingContext = createContext(null);

export function determineArtistInitialRoute({ verificationStatus, isProfileComplete, artistDetails, aadhaarFiles, profilePhoto }) {
  const status = String(verificationStatus || "").toUpperCase();
  if (status === "REJECTED") {
    return "ApprovalRejected";
  }
  // Only route to ApprovalPending if profile is actually complete & submitted
  if (status === "PENDING" && isProfileComplete) {
    return "ApprovalPending";
  }
  // Unsubmitted / fresh artist onboarding starts at BecomeArtist ("Join Now as Artist")
  return "BecomeArtist";
}

const defaultArtistDetails = {
  fullName: "",
  email: "",
  city: "",
  state: "",
  bio: "",
  experienceYears: "",
  homeService: true,
  salonService: false,
  gender: "",
  phone: "",
  location: "",
  pincode: "",
  latitude: "26.912434",
  longitude: "75.787270",
  aadhaarNumber: "",
  panNumber: "",
};

export function ArtistOnboardingProvider({ children }) {
  const { isAuthenticated, user, dispatch: authDispatch } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState("NOT_SUBMITTED"); // NOT_SUBMITTED, PENDING, APPROVED, REJECTED
  const [rejectionReason, setRejectionReason] = useState(null);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [artistProfileCompleted, setArtistProfileCompleted] = useState(false);
  const [artistApproved, setArtistApproved] = useState(false);

  const [artistDetails, setArtistDetails] = useState(defaultArtistDetails);

  const [aadhaarFiles, setAadhaarFiles] = useState({
    front: null,
    back: null,
  });
  const [panFile, setPanFile] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [workSamples, setWorkSamples] = useState([]);

  // Reset state when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setVerificationStatus("NOT_SUBMITTED");
      setRejectionReason(null);
      setIsProfileComplete(false);
      setArtistProfileCompleted(false);
      setArtistApproved(false);
      setArtistDetails(defaultArtistDetails);
      setAadhaarFiles({ front: null, back: null });
      setPanFile(null);
      setProfilePhoto(null);
      setWorkSamples([]);
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const refreshArtistProfile = useCallback(async (silent = false) => {
    if (!isAuthenticated || String(user?.role).toUpperCase() !== "ARTIST") {
      if (!silent) setIsLoading(false);
      return null;
    }

    try {
      if (!silent) setIsLoading(true);
      console.log(`[ARTIST_APPROVAL_DEBUG] BEFORE refreshArtistProfile -> artistApproved: ${artistApproved} | verificationStatus: ${verificationStatus}`);
      const res = await getArtistDetails();
      const profile = res?.data || res;

      if (profile && (profile.id || profile.user_id || profile.user?.id)) {
        const rawStatus = profile.verification_status || profile.status || "NOT_SUBMITTED";
        const status = String(rawStatus).toUpperCase();
        const hasAadhaar = Boolean(profile.aadhaar_front || profile.aadhaar_number);
        const hasBio = Boolean(profile.bio && String(profile.bio).trim().length > 0);
        const complete = Boolean(
          profile.isProfileComplete ||
          (hasBio && hasAadhaar)
        );
        const reason = profile.rejection_reason || null;
        const isApproved = status === "APPROVED";

        const effectiveStatus = complete ? status : "NOT_SUBMITTED";

        console.log(`[ARTIST_APPROVAL_DEBUG] USER_ID: ${user?.id || profile.user_id || profile.id}`);
        console.log(`[ARTIST_APPROVAL_DEBUG] ROLE: ${user?.role || profile.user?.role}`);
        console.log(`[ARTIST_APPROVAL_DEBUG] ARTIST_PROFILE_ID: ${profile.id || profile.user_id}`);
        console.log(`[ARTIST_APPROVAL_DEBUG] API_STATUS: ${profile.status}`);
        console.log(`[ARTIST_APPROVAL_DEBUG] VERIFICATION_STATUS: ${status}`);
        console.log(`[ARTIST_APPROVAL_DEBUG] EFFECTIVE_STATUS: ${effectiveStatus}`);
        console.log(`[ARTIST_APPROVAL_DEBUG] IS_VERIFIED: ${profile.user?.is_verified ?? user?.is_verified}`);
        console.log(`[ARTIST_APPROVAL_DEBUG] IS_ACTIVE: ${profile.user?.is_active ?? user?.is_active}`);
        console.log(`[ARTIST_APPROVAL_DEBUG] ONBOARDING_COMPLETE: ${complete}`);
        console.log(`[ARTIST_APPROVAL_DEBUG] ARTIST_APPROVED_CONTEXT: ${isApproved}`);

        setVerificationStatus(effectiveStatus);
        setRejectionReason(reason);
        setIsProfileComplete(complete);
        setArtistApproved(isApproved);
        setArtistProfileCompleted(complete);

        setArtistDetails((prev) => ({
          ...prev,
          fullName: profile.user?.full_name || profile.user?.name || profile.name || prev.fullName,
          email: profile.user?.email || profile.email || prev.email,
          phone: profile.user?.phone || profile.phone || prev.phone,
          bio: profile.bio || prev.bio,
          city: profile.city || prev.city,
          state: profile.state || prev.state,
          pincode: profile.pincode || prev.pincode,
          experienceYears: profile.experience_years !== undefined && profile.experience_years !== null ? String(profile.experience_years) : prev.experienceYears,
          startingPrice: profile.starting_price ? String(profile.starting_price) : (prev.startingPrice || "1500"),
          location: profile.location || profile.locality || prev.location,
          languages: profile.languages || prev.languages || "English, Hindi",
          homeService: profile.home_service !== undefined ? Boolean(profile.home_service) : prev.homeService,
          salonService: profile.salon_service !== undefined ? Boolean(profile.salon_service) : prev.salonService,
          latitude: profile.latitude ? String(profile.latitude) : prev.latitude,
          longitude: profile.longitude ? String(profile.longitude) : prev.longitude,
          aadhaarNumber: profile.aadhaar_number || prev.aadhaarNumber,
          panNumber: profile.pan_number || prev.panNumber,
        }));

        if (profile.aadhaar_front || profile.aadhaar_back) {
          setAadhaarFiles({
            front: profile.aadhaar_front || null,
            back: profile.aadhaar_back || null,
          });
        }
        if (profile.selfie_image || profile.user?.profile_image || profile.user?.avatar) {
          setProfilePhoto(profile.selfie_image || profile.user?.profile_image || profile.user?.avatar);
        }

        if (profile.user && authDispatch) {
          const userChanged = !user ||
            user.name !== profile.user.name ||
            user.email !== profile.user.email ||
            user.is_verified !== profile.user.is_verified ||
            user.is_active !== profile.user.is_active;

          if (userChanged) {
            authDispatch({ type: "UPDATE_USER", payload: profile.user });
            await secureStorage.setUserData({ ...(user || {}), ...profile.user });
          }
        }

        // Cache flag locally for instant render on restart
        await secureStorage.setArtistProfileCompleted(complete);
        return { verificationStatus: effectiveStatus, isApproved, profile };
      } else {
        setVerificationStatus("NOT_SUBMITTED");
        setIsProfileComplete(false);
        setArtistApproved(false);
        setArtistProfileCompleted(false);
        return { verificationStatus: "NOT_SUBMITTED", isApproved: false, profile: null };
      }
    } catch (err) {
      console.warn("[ArtistOnboardingContext] Error fetching canonical profile:", err.message);
      // Fallback to local storage if network fails
      const cachedCompleted = await secureStorage.getArtistProfileCompleted();
      if (cachedCompleted) {
        setArtistProfileCompleted(true);
      }
      return null;
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [isAuthenticated, user?.id, user?.role]);

  useEffect(() => {
    if (isAuthenticated && String(user?.role).toUpperCase() === "ARTIST") {
      refreshArtistProfile(true);
    }
  }, [isAuthenticated, user?.id, user?.role, refreshArtistProfile]);

  const updateArtistDetails = (details) => {
    setArtistDetails((prev) => ({ ...prev, ...details }));
  };

  const updateAadhaarFiles = (files) => {
    setAadhaarFiles((prev) => ({ ...prev, ...files }));
  };

  const addWorkSample = () => {
    setWorkSamples((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        title: `Portfolio sample ${prev.length + 1}`,
      },
    ]);
  };

  const removeWorkSample = (sampleId) => {
    setWorkSamples((prev) => prev.filter((item) => item.id !== sampleId));
  };

  const submitArtistProfile = async () => {
    await refreshArtistProfile();
  };

  const value = useMemo(
    () => ({
      isLoading,
      verificationStatus,
      rejectionReason,
      isProfileComplete,
      artistProfileCompleted,
      artistApproved,
      artistDetails,
      aadhaarFiles,
      panFile,
      profilePhoto,
      workSamples,
      updateArtistDetails,
      updateAadhaarFiles,
      setPanFile,
      setProfilePhoto,
      addWorkSample,
      removeWorkSample,
      submitArtistProfile,
      refreshArtistProfile,
      setArtistApproved,
      setArtistProfileCompleted,
    }),
    [
      isLoading,
      verificationStatus,
      rejectionReason,
      isProfileComplete,
      artistProfileCompleted,
      artistApproved,
      artistDetails,
      aadhaarFiles,
      panFile,
      profilePhoto,
      workSamples,
      refreshArtistProfile,
    ],
  );

  return (
    <ArtistOnboardingContext.Provider value={value}>
      {children}
    </ArtistOnboardingContext.Provider>
  );
}

export function useArtistOnboarding() {
  const context = useContext(ArtistOnboardingContext);
  if (!context) {
    throw new Error(
      "useArtistOnboarding must be used within an ArtistOnboardingProvider",
    );
  }

  return context;
}
