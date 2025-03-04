import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import Bar, { BarSchema } from "@models/barModels";
import createError from "http-errors";
import Cloudinary from "@shared/cloudinary";
import { buildBarObject, fetchNearbyVenues } from "@services/barServices";

const create = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  console.log(req.body);
  const cover = req.body.cover;
  const gallery = req.body.gallery;
  const data = JSON.parse(req.body.data);
  const newBar = new Bar({
    name: data.name,
    barType: data.barType,
    waitTime: data.waitTime,
    crowdMeter: data.crowdMeter,
    reviews: data.reviews,
    cover,
    gallery,
    about: data.about
  });
  const bar = await newBar.save();
  return res.status(StatusCodes.OK).json({ success: true, message: "Bar crated successfully.", data: bar });
};

const getById = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const id = req.params.id;
  const bar = await Bar.findById(id);
  return res.status(StatusCodes.OK).json({ success: true, message: "Success", data: bar });
};

const getAllBars = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { search } = req.query;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const skip = (page - 1) * limit;

  if (page < 1 || limit < 1) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: "Page and limit must be positive integers",
      data: {}
    });
  }

  const matchCriteria = search ? {
    $or: [
      { name: { $regex: search, $options: "i" } },
      { placeName: { $regex: search, $options: "i" } }
    ]
  } : {};

  const bars = await Bar.find(matchCriteria).limit(limit).skip(skip).lean();
  const total = await Bar.countDocuments(matchCriteria);
  const totalPages = Math.ceil(total / limit);

  return res.status(StatusCodes.OK).json({
    success: true, message: "Success", data: {
      bars,
      pagination: { page, limit, total, totalPages }
    }
  });
};

const update = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const id = req.params.id;
  const bar = await Bar.findById(id);
  if (!bar) throw createError(StatusCodes.NOT_FOUND, "Bar not found");
  let updatedFields: Record<string, any> = {};
  if (req.body.data) {
    updatedFields = JSON.parse(req.body.data);
  }
  if (req.body.cover && !bar.cover) {
    await Cloudinary.remove(bar.cover);
    updatedFields.cover = req.body.cover;
  }
  if (!updatedFields) throw createError(StatusCodes.BAD_REQUEST, "Nothing to update");
  const updatedBar = await Bar.findByIdAndUpdate(id, { $set: updatedFields }, { new: true });
  return res.status(StatusCodes.OK).json({ success: true, message: "Bar updated successfully", data: updatedBar });
};

const remove = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const id = req.params.id;
  const bar = await Bar.findById(id);
  if (!bar) throw createError(StatusCodes.NOT_FOUND, "Bar not found");
  await Bar.findByIdAndDelete(id);
  return res.status(StatusCodes.OK).json({ success: true, message: "Bar deleted successfully.", data: bar });
};

const mapSearch = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radius = 1500;

  if (!lat || !lng) {
    throw createError(StatusCodes.BAD_REQUEST, "Latitude and longitude are required.");
  }

  const venues = await fetchNearbyVenues(lat, lng, radius);
  console.log(venues);
  const resultBars: any[] = [];

  for (const venue of venues) {
    const existingBar = await Bar.findOne({ placeId: venue.place_id });
    if (existingBar) {
      resultBars.push(existingBar);
    } else {
      const newBarData = await buildBarObject(venue, lat, lng);
      console.log(newBarData.about.schedule);
      const newBar = new Bar(newBarData);
      await newBar.save();
      resultBars.push(newBar);
    }
  }

  const bars = resultBars.map(bar => ({
    _id: bar.id,
    cover: bar.cover,
    barType: bar.barType,
    name: bar.name,
    crowdMeter: bar.crowdMeter,
    currentDate: bar.currentDate,
    closeTime: bar.closeTime,
    location: bar.about.address,
  }));

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Bar created successfully.",
    data: bars
  });
};


const BarController = {
  create,
  getById,
  getAllBars,
  update,
  remove,
  mapSearch,
};

export default BarController;