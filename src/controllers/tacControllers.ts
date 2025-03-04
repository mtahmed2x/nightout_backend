import TaC from "@models/tacModel";
import to from "await-to-ts";
import { Request, Response, NextFunction } from "express";
import createError from "http-errors";
import { StatusCodes } from "http-status-codes";

const create = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const text  = req.body.text;
  const tac = await TaC.create({ text: text });
  return res.status(StatusCodes.CREATED).json({ success: true, message: "Success", data: tac });
};

const get = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const tac = await TaC.findOne().limit(1);
  if (!tac) return res.status(StatusCodes.OK).json({ success: true, message: "No Terms and Conditions", data: {} });
  return res.status(StatusCodes.OK).json({ success: true, message: "Success", data: tac });
};

const update = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { text } = req.body;
  const tac = await TaC.findOne();
  if (!tac) throw createError(StatusCodes.NOT_FOUND, "Terms and Condition not found");
  tac.text = text;
  await tac.save();
  return res.status(StatusCodes.OK).json({ success: true, message: "Success", data: tac });
};

const TaCController = {
  create,
  get,
  update
};

export default TaCController;
