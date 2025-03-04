import Cloudinary from "@shared/cloudinary";
import { NextFunction, Request, Response } from "express";
import { UploadedFile } from "express-fileupload";
import createError from "http-errors";
import { StatusCodes } from "http-status-codes";
import { logger } from "@shared/logger";

const uploadFileToCloudinary = async (file: UploadedFile, folder: string): Promise<string> => {
  try {
    return await Cloudinary.upload(file, folder);
  } catch (error: any) {
    throw new Error(`Failed to upload ${folder} file: ${error.message}`);
  }
};

export const fileHandler = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const fileFields = [
      { fieldName: "avatarImage", folder: "nightout/profile", key: "avatar" },
      { fieldName: "coverImage", folder: "nightout/bar/cover", key: "cover" },
      { fieldName: "galleryImages", folder: "nightout/gallery", key: "gallery" }
    ];

    if (req.files) {

      await Promise.all(
        fileFields.map(async ({ fieldName, folder, key }) => {
          if (fieldName === "content[contentImage]" || fieldName === "content[contentVideo]") {
            const file = req.files![fieldName];
            if (file) {
              req.body.content[key] = await uploadFileToCloudinary(file as UploadedFile, folder);
            }
          }

          const file = req.files![fieldName];
          if (file) {
            if (fieldName === "galleryImages" && Array.isArray(file)) {
              req.body[key] = await Promise.all(
                (file as UploadedFile[]).map((f) => uploadFileToCloudinary(f, folder))
              );
            } else {
              req.body[key] = await uploadFileToCloudinary(file as UploadedFile, folder);
            }
          }
        })
      );
    }
    next();
  } catch (error: any) {
    next(createError(StatusCodes.BAD_REQUEST, error.message));
  }
};

export default fileHandler;
