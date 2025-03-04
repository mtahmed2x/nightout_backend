import mongoose, { Schema, Types } from "mongoose";

export type FavoriteSchema = {
  bar: Types.ObjectId[];
  user: Types.ObjectId;
}

const favoriteSchema = new Schema<FavoriteSchema>({
  bar: [{ type: Schema.Types.ObjectId, ref: "Bar", required: true }],
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
});

const Favorite = mongoose.model<FavoriteSchema>("Favorite", favoriteSchema);
export default Favorite;
