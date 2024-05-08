import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  secure: true,
});

export async function uploadImage(imagePath: any, imageName: any) {
  const options = {
    public_id: imageName,
    folder: "prisma-store",
    unique_filename: false,
    overwrite: true,
  };

  try {
    const result = await cloudinary.uploader.upload(imagePath, options);
    return {
      public_id: result.public_id,
      url: result.url,
      asset_id: result.asset_id,
    };
  } catch (error) {
    console.error(error);
  }
}

export async function destroyImage(publicId: any) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error(error);
  }
}
