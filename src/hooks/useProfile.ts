import { useState, useEffect, useCallback } from "react";
import {
  profileService,
  ProfileData,
  UpdateProfileRequest,
  UploadPhotoRequest,
} from "../services/profileService";
import { useAuth } from "../context/AuthContext";

interface UseProfileReturn {
  profile: ProfileData | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
  uploadPhoto: (data: UploadPhotoRequest) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useProfile = (): UseProfileReturn => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, token, isInitialized } = useAuth();

  const fetchProfile = useCallback(async () => {
    // Don't fetch if not authenticated or still initializing
    if (!token || !isInitialized) {
      console.log("Profile fetch skipped - no token or not initialized", {
        token: !!token,
        isInitialized,
      });
      setIsLoading(false);
      return;
    }

    try {
      console.log("Fetching profile...");
      setIsLoading(true);
      setError(null);
      const profileData = await profileService.getMyProfile();
      console.log("Profile fetched successfully:", profileData);
      setProfile(profileData);
    } catch (err: any) {
      console.error("Error fetching profile:", err);
      const errorMessage = err.message || "Failed to fetch profile";
      setError(errorMessage);

      // If it's an authentication error, don't show it to the user
      if (
        err.message?.includes("authenticate") ||
        err.message?.includes("401")
      ) {
        setError("Please log in to view your profile");
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, isInitialized]);

  const updateProfile = useCallback(
    async (data: UpdateProfileRequest) => {
      if (!token) {
        throw new Error("Not authenticated");
      }

      try {
        setError(null);
        const updatedProfile = await profileService.updateMyProfile(data);
        setProfile(updatedProfile);
      } catch (err: any) {
        setError(err.message || "Failed to update profile");
        throw err;
      }
    },
    [token]
  );

  const uploadPhoto = useCallback(
    async (data: UploadPhotoRequest) => {
      if (!token) {
        throw new Error("Not authenticated");
      }

      try {
        setError(null);
        const updatedProfile = await profileService.uploadProfilePhoto(data);
        setProfile(updatedProfile);
      } catch (err: any) {
        setError(err.message || "Failed to upload photo");
        throw err;
      }
    },
    [token]
  );

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  // Fetch profile when token changes or when initialized
  useEffect(() => {
    console.log("useProfile effect triggered", {
      token: !!token,
      isInitialized,
      user: !!user,
    });

    if (token && isInitialized) {
      fetchProfile();
    } else if (!token && isInitialized) {
      // User is not authenticated, clear profile and stop loading
      setProfile(null);
      setError(null);
      setIsLoading(false);
    }
  }, [token, isInitialized, fetchProfile]);

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    uploadPhoto,
    refreshProfile,
  };
};
