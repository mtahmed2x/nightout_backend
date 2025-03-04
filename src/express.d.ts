import { DecodedUser } from "@schemas/decodedUser";
import { DecodedAdmin } from "@models/adminModel";
import { ClientSession } from "mongoose";
import fileUpload from "express-fileupload";


declare global {
  namespace Express {
    interface Request {
      user: DecodedUser;
      admin: DecodedAdmin;
      session: ClientSession;
      files?: fileUpload.FileArray | null | undefined;
    }
  }
}
