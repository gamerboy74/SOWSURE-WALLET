import { supabase } from "./supabase";

export const getStorageUrl = (bucketName: string, path: string | null) => {
  if (!path) return null;

  try {
    const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
    return data.publicUrl;
  } catch (error) {
    console.error(
      `Error getting storage URL for ${bucketName}/${path}:`,
      error
    );
    return null;
  }
};
