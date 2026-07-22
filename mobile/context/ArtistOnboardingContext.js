import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { secureStorage } from "../utils/storage";

const ArtistOnboardingContext = createContext(null);

export function ArtistOnboardingProvider({ children }) {
  const [artistProfileCompleted, setArtistProfileCompleted] = useState(false);
  const [artistApproved, setArtistApproved] = useState(false);

  useEffect(() => {
    (async () => {
      const completed = await secureStorage.getArtistProfileCompleted();
      if (completed) {
        setArtistProfileCompleted(true);
      }
    })();
  }, []);
  const [artistDetails, setArtistDetails] = useState({
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
    latitude: "",
    longitude: "",
  });
  const [aadhaarFiles, setAadhaarFiles] = useState({
    front: null,
    back: null,
  });
  const [panFile, setPanFile] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [workSamples, setWorkSamples] = useState([]);

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

  const submitArtistProfile = () => {
    setArtistProfileCompleted(true);
    setArtistApproved(false);
  };

  const value = useMemo(
    () => ({
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
      setArtistApproved,
      setArtistProfileCompleted,
    }),
    [
      artistProfileCompleted,
      artistApproved,
      artistDetails,
      aadhaarFiles,
      panFile,
      profilePhoto,
      workSamples,
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
