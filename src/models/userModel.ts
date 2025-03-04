import { Schema, model, Types, Document, UpdateQuery } from "mongoose";
import { Gender } from "@shared/enums";
import Cloudinary from "@shared/cloudinary";

export type DecodedUser = {
  authId: string;
  userId: string;
  userName: string;
  email: string;
  isVerified: boolean;
};

export type UserSchema = Document & {
  auth: Types.ObjectId;
  userName: string;
  avatar: string;
  phoneNumber: string;
  age: number;
  gender: string;
};

const userSchema = new Schema(
  {
    auth: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    phoneNumber: {
      type: String,
      default: "",
    },
    age: {
      type: Number,
      default: 0,
    },
    gender: {
      type: String,
      enum: Object.values(Gender),
      default: Gender.NONE,
    },
  },
  {
    timestamps: true,
  }
);


userSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate() as UpdateQuery<any>; // Explicitly cast update to UpdateQuery

  if (update?.$set && "avatar" in update.$set) {
    const user = await this.model.findOne(this.getQuery()).select("avatar");
    if (user?.avatar) {
      try {
        await Cloudinary.remove(user.avatar);
      } catch (err) {
        console.error("Error deleting previous avatar from Cloudinary:", err);
      }
    }
  }
  next();
});

export const User = model<UserSchema>("User", userSchema);
export default User;
