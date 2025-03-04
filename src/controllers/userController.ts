import { Request, Response, NextFunction } from "express";
import User from "@models/userModel";
import createError from "http-errors";
import { StatusCodes } from "http-status-codes";
import to from "await-to-ts";
import Cloudinary from "@shared/cloudinary";

const get = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const userId = req.user.userId;
  let error, user;
  [error, user] = await to(User.findById(userId).populate({ path: "auth", select: "email" }));
  if (error) return next(error);
  if (!user) return next(createError(StatusCodes.NOT_FOUND, "User not found."));
  return res.status(StatusCodes.OK).json({ success: true, message: "User data retrieved successfully.", data: user });
};

const getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { search, sort } = req.query;
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
      { "authDetails.email": { $regex: search, $options: "i" } },
      { userName: { $regex: search, $options: "i" } },
      { phoneNumber: { $regex: search, $options: "i" } },
      { gender: search },
    ]
  } : {};

  const aggregation: any[] = [
    {
      $lookup: {
        from: "auths",
        localField: "auth",
        foreignField: "_id",
        as: "authDetails"
      }
    },
    { $unwind: { path: "$authDetails", preserveNullAndEmptyArrays: true } },
    { $match: matchCriteria },
    {
      $project: {
        "authDetails._id": 1,
        "authDetails.email": 1,
        "authDetails.isBlocked": 1,
        userName: 1,
        avatar: 1,
        phoneNumber: 1,
        gender: 1,
        age: 1,
      }
    },
    { $skip: skip },
    { $limit: limit }
  ];

  // Add sorting if sort=true is passed
  if (sort === "true") {
    aggregation.push({ $sort: { createdAt: 1 } });
  }

  const countAggregation = [
    ...aggregation.slice(0, 4),
    { $count: "total" }
  ];

  let users, total;

  if (search) {
    users = await User.aggregate(aggregation);
    const totalResult = await User.aggregate(countAggregation);
    total = totalResult[0]?.total || 0;
  } else {
    const fetchedUsers = await
      User.find()
        .populate({ path: "auth", select: "email isBlocked" })
        .select("userName avatar phoneNumber gender age")
        .lean()
        .skip(skip)
        .limit(limit);

    users = fetchedUsers || [];
    total = await User.countDocuments();
  }

  const totalPages = Math.ceil(total / limit);

  // if (!users.length) {
  //   return res.status(StatusCodes.OK).json({
  //     success: true,
  //     message: "No users found",
  //     data: {
  //       users: [],
  //       pagination: search ? undefined : { page, limit, total: 0, totalPages: 0 }
  //     }
  //   });
  // }
  // users = users.filter(user => user !== null);
  res.status(StatusCodes.OK).json({
    success: true,
    message: "Successfully retrieved users information",
    data: {
      users,
      pagination: { page, limit, total, totalPages }
    }
  });
};

const update = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const id = req.user.userId;
  let user = await User.findById(id);
  if(!user ) throw createError(StatusCodes.NOT_FOUND, "User not found.");
  let updates: Record<string, any> = {};
  if(req.body.data) updates = JSON.parse(req.body.data);
  updates.avatar = req.body.avatar;
  if(updates.avatar && user.avatar) {
    await Cloudinary.remove(user.avatar);
  }
  user = await User.findByIdAndUpdate(id, { $set: updates }, { new: true }).populate({path: "auth", select: "email"});
  return res.status(StatusCodes.OK).json({ success: true, message: "Success", data: user });
};

const UserController = {
  get,
  getAllUsers,
  update
};

export default UserController;
