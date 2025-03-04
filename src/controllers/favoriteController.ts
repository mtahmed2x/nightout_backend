import { Request, Response, NextFunction } from "express";
import Favorite from "@models/favoriteModel";
import { Types } from "mongoose";
import { StatusCodes } from "http-status-codes";


const get = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const userId = req.user.userId;

  const favorite = await Favorite.findOne({ user: userId }).populate({
    path: "bar",
    select: "name cover barType total_reviewer average_rating about.address.placeName"
  });

  if (!favorite) {
    return res.status(StatusCodes.OK).json({ success: true, message: "Success", data: { favorites: [] } });
  }

  const flattenedFavorites = favorite.bar.map((bar: any) => ({
    _id: bar._id,
    name: bar.name,
    barType: bar.barType,
    total_reviewer: bar.total_reviewer,
    average_rating: bar.average_rating,
    cover: bar.cover,
    placeName: bar.about?.address?.placeName || ""
  }));

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Success",
    data: { favorites: flattenedFavorites }
  });
};


const toggle = async (req: Request, res: Response, next: NextFunction) : Promise<any> => {
  const id = req.params.id;
  const userId = req.user.userId;
  let favorite = await Favorite.findOne({user: userId});
  if(!favorite) {
    favorite = await Favorite.create({bar: id, user: userId});
  }
  if(!favorite.bar.includes(new Types.ObjectId(id))) {
    favorite.bar.push(new Types.ObjectId(id));
  } else {
    favorite.bar = favorite.bar.filter((barId) => barId === new Types.ObjectId(id));
  }
  await favorite.save();
  const message = favorite.bar.includes(new Types.ObjectId(id)) ? "Added to favorites" : "Removed from favorites";
  return res.status(StatusCodes.OK).json({ success: true, message: message, data: {} });
}

const FavoriteController = {
  get,
  toggle,
}

export default FavoriteController;