export interface ProfileData {
    _id: string;
    name: string;
    email: string;
    bio?: string;
    photo?: string;
}

export interface UpdateProfileRequest {
    name?: string;
    bio?: string;
}

export interface UploadPhotoRequest {
    photo: File;
}

export const profileService = {
    getProfile: async () => ({} as ProfileData),
    getMyProfile: async () => ({} as ProfileData),
    updateProfile: async (data: any) => (data as ProfileData),
    updateMyProfile: async (data: any) => (data as ProfileData),
    uploadProfilePhoto: async (data: any) => (data as ProfileData)
};
