import createError from "http-errors";
import { StatusCodes } from "http-status-codes";
import { NextFunction, Request, Response } from "express";
import Admin from "@models/adminModel";
import sendEmail from "@utils/sendEmail";
import Cloudinary from "@shared/cloudinary";
import { logger } from "@shared/logger";
import Auth from "@models/authModel";
import User from "@models/userModel";
import { startOfWeek, endOfWeek, subWeeks, format } from "date-fns";
import Bar from "@models/barModels";

const login = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { email, password } = req.body;
  let admin = await Admin.findByEmail(email);
  if (!admin) return next(createError(StatusCodes.NOT_FOUND, "No account found with the given email"));

  if (!(await admin.comparePassword(password)))
    return next(createError(StatusCodes.UNAUTHORIZED, "Wrong password. Please try again"));

  const accessToken = Admin.generateAccessToken(admin._id!.toString());

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Login successful",
    data: { accessToken: accessToken }
  });
};

const recovery = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { email } = req.body;

  let admin = await Admin.findByEmail(email);
  if (!admin) return next(createError(StatusCodes.NOT_FOUND, "No account found with the given email"));
  admin.generateRecoveryOTP();

  await sendEmail(email, admin.recoveryOTP);
  await admin.save();
  return res
    .status(StatusCodes.OK)
    .json({ success: true, message: "Success", data: { recoveryOTP: admin.recoveryOTP } });
};

const recoveryVerification = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { email, recoveryOTP } = req.body;

  let admin = await Admin.findByEmail(email);
  if (!admin) return next(createError(StatusCodes.NOT_FOUND, "User not found"));
  if (admin.isRecoveryOTPExpired()) return next(createError(StatusCodes.UNAUTHORIZED, "Recovery OTP has expired."));
  if (!admin.isCorrectRecoveryOTP(recoveryOTP))
    return next(createError(StatusCodes.UNAUTHORIZED, "Wrong OTP. Please try again"));
  admin.clearRecoveryOTP();
  await admin.save();

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Email successfully verified.",
    data: {}
  });
};

const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { email, password, confirmPassword } = req.body;

  let admin = await Admin.findByEmail(email);
  if (!admin) throw createError(StatusCodes.NOT_FOUND, "User Not Found");
  if (password !== confirmPassword) throw createError(StatusCodes.BAD_REQUEST, "Passwords don't match");

  admin.password = password;
  await admin.save();
  return res.status(StatusCodes.OK).json({ success: true, message: "Password reset successful", data: {} });
};

const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const email = req.admin.email;
  const { password, newPassword, confirmPassword } = req.body;
  const admin = await Admin.findByEmail(email);
  if (!admin) throw createError(StatusCodes.NOT_FOUND, "Admin Not Found");
  if (!(await admin.comparePassword(password)))
    throw createError(StatusCodes.UNAUTHORIZED, "Wrong Password. Please try again.");

  admin.password = newPassword;
  await admin.save();
  return res.status(StatusCodes.OK).json({ success: true, message: "Password changed successfully", data: {} });
};

const create = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { userName, email, avatar, phoneNumber, role, password } = req.body;
  const admin = new Admin({ userName, email, avatar, phoneNumber, role, password });
  await admin.save();
  return res.status(StatusCodes.CREATED).json({ success: true, message: "Admin created successfully", data: {} });
};

const getAllAdmins = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
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
      { email: { $regex: search, $options: "i" } },
      { phoneNumber: { $regex: search, $options: "i" } }
    ]
  } : {};

  const admins = await Admin.find(matchCriteria).limit(limit).skip(skip).lean();
  const total = await Admin.countDocuments(matchCriteria);
  const totalPages = Math.ceil(total / limit);

  return res.status(StatusCodes.OK).json({
    success: true, message: "Success", data: {
      admins,
      pagination: { page, limit, total, totalPages }
    }
  });

};

const getAdminInfo = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const email = req.admin.email;
  const admin = await Admin.findByEmailWithoutPassword(email);
  return res.status(StatusCodes.OK).json({ success: true, message: "Admin info successfully.", data: admin });
};

const updateAdmin = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const id = req.params.id;
  const email = req.admin.email;
  const updatedFields = req.body;
  let admin;
  if (id) {
    admin = await Admin.findById(id);
  } else if (email) {
    admin = await Admin.findByEmail(email);
  }
  if (!admin) throw createError(StatusCodes.NOT_FOUND, "Admin not found");
  if (updatedFields.avatar && admin.avatar) await Cloudinary.remove(admin.avatar);
  const updatedAdmin = await Admin.findByIdAndUpdate(admin._id, { $set: updatedFields }, { new: true });
  return res.status(StatusCodes.OK).json({ success: true, message: "Admin updated successfully.", data: updatedAdmin });
};

const removeAdminById = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const id = req.params.id;
  const admin = await Admin.findById(id);
  if (!admin) throw createError(StatusCodes.NOT_FOUND, "Admin Not Found");
  if (admin.avatar) await Cloudinary.remove(admin.avatar);
  await Admin.findByIdAndDelete(id);
  return res.status(StatusCodes.OK).json({ success: true, message: "Admin removed successfully.", data: {} });
};

const blockUserToggle = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const id = req.params.id;
  const auth = await Auth.findById(id);
  if (!auth) throw createError(StatusCodes.NOT_FOUND, "Auth not found");
  auth.isBlocked = !auth.isBlocked;
  await auth.save();
  return res.status(StatusCodes.OK).json({
    success: true,
    message: auth.isBlocked ? "User blocked successfully" : "User unblocked successfully",
    data: { isBlocked: auth.isBlocked }
  });
};

const analytics = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const totalUsers = await Auth.countDocuments();
  const activeUsers = await Auth.countDocuments({ isVerified: true });
  const totalBars = await Bar.countDocuments();
  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Success",
    data: { totalUsers: totalUsers, activeUsers: activeUsers, totalBars: totalBars }
  });
};

const getYearlyUserGrowth = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const year = 2025;

  const startOfPrevYear = new Date(`${year - 1}-01-01T00:00:00.000Z`);
  const endOfThisYear = new Date(`${year}-12-31T23:59:59.999Z`);

  const userGrowth = await User.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startOfPrevYear,
          $lte: endOfThisYear
        }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 }
    }
  ]);

  const monthLabels = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const result: Record<string, { current: number; prev: number }> = {};
  monthLabels.forEach((month) => {
    result[month] = { current: 0, prev: 0 };
  });

  userGrowth.forEach(({ _id, count }) => {
    const monthIndex = _id.month - 1;
    const monthName = monthLabels[monthIndex];

    if (_id.year === year) {
      result[monthName].current = count;
    } else if (_id.year === year - 1) {
      result[monthName].prev = count;
    }
  });

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Successfully retrieved yearly users growth",
    data: result
  });
};

const getWeeklyUserGrowth = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const today = new Date();
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); // Monday as start
  const endOfCurrentWeek = endOfWeek(today, { weekStartsOn: 1 });
  const startOfPrevWeek = subWeeks(startOfCurrentWeek, 1);

  const currentWeek = Number(format(startOfCurrentWeek, "w"));
  const prevWeek = Number(format(startOfPrevWeek, "w"));

  const userGrowth = await User.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startOfPrevWeek,
          $lte: endOfCurrentWeek
        }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          week: { $week: "$createdAt" }, // Changed from $isoWeek
          day: { $dayOfWeek: "$createdAt" }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { "_id.week": 1, "_id.day": 1 }
    }
  ]);

  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const result: Record<string, { current: number; prev: number }> = {};
  weekdayLabels.forEach((day) => {
    result[day] = { current: 0, prev: 0 };
  });

  userGrowth.forEach(({ _id, count }) => {
    const dayIndex = _id.day - 1;
    const dayName = weekdayLabels[(dayIndex + 5) % 7]; // Adjust MongoDB Sunday-based indexing

    if (_id.week === currentWeek) {
      result[dayName].current = count;
    } else if (_id.week === prevWeek) {
      result[dayName].prev = count;
    }
  });

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Successfully retrieved weekly users growth",
    data: result
  });
};


const AdminServices = {
  login,
  recovery,
  recoveryVerification,
  resetPassword,
  changePassword,
  create,
  getAllAdmins,
  getAdminInfo,
  updateAdmin,
  removeAdminById,
  blockUserToggle,
  analytics,
  getYearlyUserGrowth,
  getWeeklyUserGrowth
};

export default AdminServices;