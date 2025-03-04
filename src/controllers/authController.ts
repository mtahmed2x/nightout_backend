import to from "await-to-ts";
import mongoose from "mongoose";
import createError from "http-errors";
import { StatusCodes } from "http-status-codes";
import { Request, Response, NextFunction } from "express";
import Auth from "@models/authModel";
import User from "@models/userModel";
import sendEmail from "@utils/sendEmail";
import { logger } from "@shared/logger";

const register = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { userName, email, phoneNumber, password, confirmPassword } = req.body;

  let auth = await Auth.findByEmail(email);
  if (auth) {
    const message = auth.isVerified ? "Email already exists! Please login." : "Email already exists! Please verify your account";
    return res
      .status(StatusCodes.CONFLICT)
      .json({ success: false, message: message, data: { isVerified: auth.isVerified } });
  }

  const session = req.session;
  auth = new Auth({
    email,
    password,
  });
  auth.generateVerificationOTP();
  logger.info(auth.verificationOTP);
  await auth.save({ session });

  const user = new User({
    auth: auth._id,
    userName,
    phoneNumber,
  });
  await user.save({session});
  await sendEmail(email, auth.verificationOTP);

  return res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Registration successful",
    data: { isVerified: auth.isVerified, otp: auth.verificationOTP },
  });
};

const activate = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { email, otp } = req.body;
  let auth;
  auth = await Auth.findByEmail(email);
  if (!auth) throw createError(StatusCodes.NOT_FOUND, "User not found");

  if (!auth.isCorrectVerificationOTP(otp))
    throw createError(StatusCodes.UNAUTHORIZED, "Wrong OTP. Please enter the correct code");

  if (auth.isVerificationOTPExpired())
    throw createError(StatusCodes.UNAUTHORIZED, "Verification OTP has expired.");

  auth.clearVerificationOTP();
  auth.isVerified = true;
  await auth.save();
  const accessToken = Auth.generateAccessToken(auth._id!.toString());

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Account successfully verified.",
    data: { accessToken: accessToken },
  });
};

const login = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { email, password } = req.body;
  let auth = await Auth.findByEmail(email);
  if (!auth) return next(createError(StatusCodes.NOT_FOUND, "No account found with the given email"));

  if (!(await auth.comparePassword(password)))
    return next(createError(StatusCodes.UNAUTHORIZED, "Wrong password. Please try again"));

  if (!auth.isVerified) return next(createError(StatusCodes.UNAUTHORIZED, "Verify your email first"));
  const accessToken = Auth.generateAccessToken(auth._id!.toString());

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Login successful",
    data: { accessToken: accessToken },
  });
};

const signInWithGoogle = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { googleId, name, email, avatar } = req.body;
  let auth;
  auth = await Auth.findOne({ googleId: googleId });
  if (!auth) {
   auth = await Auth.create({ googleId, email });
   const user = await User.create({ auth: auth._id, userName: name, avatar });
   console.log(user._id);
  }
  const accessToken = Auth.generateAccessToken(auth._id!.toString());

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Login successful",
    data: { accessToken: accessToken},
  });
};

const resendOTP = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { email, status } = req.body;
  let auth = await Auth.findOne({ email: email });
  if (!auth) throw createError(StatusCodes.NOT_FOUND, "Account not found");

  if (status === "activate" && auth.isVerified)
    return res
      .status(StatusCodes.CONFLICT)
      .json({ success: true, message: "Your account is already verified. Please login.", data: {} });

  if (status === "activate" && !auth.isVerified) {
    auth.generateVerificationOTP();
    await auth.save();
    await sendEmail(email, auth.verificationOTP);
    return res
      .status(StatusCodes.OK)
      .json({ success: true, message: "OTP resend successful", data: { otp: auth.verificationOTP } });
  }

  if (status === "recovery") {
    auth.generateRecoveryOTP();
    await auth.save();
    await sendEmail(email, auth.recoveryOTP);
    return res.status(StatusCodes.OK).json({ success: true, message: "OTP resend successful", data: { otp: auth.recoveryOTP } });
  }
};

const recovery = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { email } = req.body;

  let auth = await Auth.findByEmail(email);
  if (!auth) return next(createError(StatusCodes.NOT_FOUND, "No account found with the given email"));
  auth.generateRecoveryOTP();

  await sendEmail(email, auth.recoveryOTP);
  await auth.save();
  return res
    .status(StatusCodes.OK)
    .json({ success: true, message: "Success", data: { otp: auth.recoveryOTP } });
};

const recoveryVerification = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { email, otp } = req.body;

  let auth = await Auth.findByEmail(email);
  if (!auth) return next(createError(StatusCodes.NOT_FOUND, "User not found"));
  if (auth.isRecoveryOTPExpired()) return next(createError(StatusCodes.UNAUTHORIZED, "Recovery OTP has expired."));
  if (!auth.isCorrectRecoveryOTP(otp))
    return next(createError(StatusCodes.UNAUTHORIZED, "Wrong OTP. Please try again"));

  auth.clearRecoveryOTP();
  await auth.save();

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Email successfully verified.",
    data: {},
  });
};

const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { email, password, confirmPassword } = req.body;

  let auth = await Auth.findByEmail(email);
  if (!auth) return next(createError(StatusCodes.NOT_FOUND, "User Not Found"));
  if (password !== confirmPassword) return next(createError(StatusCodes.BAD_REQUEST, "Passwords don't match"));

  auth.password = password;
  await auth.save();

  const accessToken = Auth.generateAccessToken(auth._id!.toString());

  return res.status(StatusCodes.OK).json({ success: true, message: "Password reset successful", data: {accessToken: accessToken} });
};

const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const user = req.user;
  const { password, newPassword, confirmPassword } = req.body;

  let auth = await Auth.findByEmail(user.email);
  if (!auth) return next(createError(StatusCodes.NOT_FOUND, "User Not Found"));
  if (!(await auth.comparePassword(password)))
    return next(createError(StatusCodes.UNAUTHORIZED, "Wrong Password. Please try again."));

  auth.password = newPassword;
  await auth.save();
  return res.status(StatusCodes.OK).json({ success: true, message: "Password changed successfully", data: {} });
};

const remove = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const userId = req.user.userId;
  const authId = req.user.authId;
  await Promise.all([Auth.findByIdAndDelete(authId), User.findByIdAndDelete(userId)]);
  return res.status(StatusCodes.OK).json({ success: true, message: "User Removed successfully", data: {} });
};

const AuthController = {
  register,
  activate,
  login,
  signInWithGoogle,
  resendOTP,
  recovery,
  recoveryVerification,
  resetPassword,
  changePassword,
  remove,
};

export default AuthController;