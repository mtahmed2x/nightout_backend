import Privacy from "@models/privacyModel";
import to from "await-to-ts";
import { Request, Response, NextFunction } from "express";
import createError from "http-errors";
import { StatusCodes } from "http-status-codes";

const create = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { text } = req.body;
  const privacy = await Privacy.create({ text });
  return res.status(StatusCodes.CREATED).json({ success: true, message: "Success", data: privacy });
};

const get = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const privacy = await Privacy.findOne().limit(1);
  if (!privacy) return res.status(StatusCodes.OK).json({ success: true, message: "No privacy policy", data: {} });
  return res.status(StatusCodes.OK).json({ success: true, message: "Success", data: privacy });
};

const update = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { text } = req.body;
  const privacy = await Privacy.findOne();
  if (!privacy) return next(createError(StatusCodes.NOT_FOUND, "Privacy policy not found"));
  privacy.text = text;
  await privacy.save();
  return res.status(StatusCodes.OK).json({ success: true, message: "Success", data: privacy });
};

const PrivacyController = {
  create,
  get,
  update
};

export default PrivacyController;
