import to from "await-to-ts";
import "dotenv/config";
import { NextFunction, Request, Response } from "express";
import createError from "http-errors";
import Auth from "@models/authModel";
import User, { DecodedUser } from "@models/userModel";
import { AdminRole } from "@shared/enums";
import { decodeToken } from "@utils/jwt";
import { StatusCodes } from "http-status-codes";
import Admin, { DecodedAdmin } from "@models/adminModel";
import { asyncHandler } from "@shared/asyncHandler";
import { logger } from "@shared/logger";

export const getUserInfo = async (authId: string): Promise<DecodedUser | null> => {
  let error, auth, user, data: DecodedUser;
  [error, auth] = await to(Auth.findById(authId).select("email role isVerified isBlocked"));
  console.log(auth!._id);
  if (error || !auth) return null;
  [error, user] = await to(User.findOne({ auth: authId }));
  console.log(user!.userName);
  if (error || !user) return null;
  data = {
    authId: auth._id!.toString(),
    email: auth.email,
    isVerified: auth.isVerified,
    userId: user._id!.toString(),
    userName: user.userName
  };
  return data;
};

export const getAdminInfo = async (id: string): Promise<DecodedAdmin | null> => {
  let error, admin, data: DecodedAdmin;
  [error, admin] = await to(Admin.findById(id));
  if (error || !admin) return null;
  data = {
    id: admin._id!.toString(),
    email: admin.email,
    role: admin.role!
  };
  return data;
};

const authorizeToken = (secret: string, isAdminCheck: boolean = false) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return next(createError(StatusCodes.UNAUTHORIZED, "Not Authorized"));
    }
    const token = authHeader.split(" ")[1];
    if (!secret) {
      return next(createError(StatusCodes.INTERNAL_SERVER_ERROR, "JWT secret is not defined."));
    }
    const decoded = decodeToken(token, secret);
    logger.info(decoded.id);
    let data;
    if (isAdminCheck) {
      data = await getAdminInfo(decoded.id);
      if (!data) return next(createError(StatusCodes.FORBIDDEN, "Forbidden"));
      logger.info(data);
      req.admin = data;
    } else {

      data = await getUserInfo(decoded.id);
      if (!data) return next(createError(StatusCodes.NOT_FOUND, "Account Not Found"));
      req.user = data;
    }
    return next();
  });
};

const hasAccess = (role: AdminRole) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const admin = req.admin;
    if (!admin) {
      throw createError(StatusCodes.UNAUTHORIZED, "Not Authorized");
    }
    if (admin.role.includes(AdminRole.All) || admin.role.includes(role)) return next();
    throw createError(403, "Access Denied.");
  });
};

export const authorize = authorizeToken(process.env.JWT_ACCESS_SECRET!);
export const admin_authorize = authorizeToken(process.env.JWT_ACCESS_SECRET!, true);
export const canAccessDashboard = hasAccess(AdminRole.Dashboard);
export const canAccessUser = hasAccess(AdminRole.User);
export const canAccessBar = hasAccess(AdminRole.Bar);
export const canAccessAdministrator = hasAccess(AdminRole.Administrator);
export const canAccessSettings = hasAccess(AdminRole.Settings);






