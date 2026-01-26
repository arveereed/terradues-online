export const uploadToCloudinary = async (
  file: File,
  folder: string,
  type: "image" | "raw",
): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;

  if (!cloudName || !uploadPreset) {
    throw new Error("Missing Cloudinary env variables");
  }

  // https://api.cloudinary.com/v1_1/<CLOUD_NAME>/<RESOURCE_TYPE>/upload
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${type}/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", folder); // 👈 creates folder automatically

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Cloudinary upload failed");
  }

  // ✅ This is the image URL you store & display
  return data.secure_url as string;
};
