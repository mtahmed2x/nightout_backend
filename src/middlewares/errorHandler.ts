import createError from "http-errors";
import StatusCodes from "http-status-codes";
import { Request, Response, NextFunction } from "express";
import { logger } from "@shared/logger";
import { Error } from "mongoose";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): any => {
  logger.error(`${err.message}\n${err.stack}\n${err.name}`);

  if (createError.isHttpError(err)) {
    return res.status(err.status).json({ success: false, message: err.message, data: {} });
  }

  if (err instanceof Error.ValidationError) {
    const errors = Object.values(err.errors)
      .map((e: any) => e.message)
      .join(", ");
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: `Validation error: ${errors}`,
      data: {},
    });
  }

  if (err.code === 11000) {
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : "field";
    const message = `Duplicate value for ${field}`;
    return res.status(StatusCodes.CONFLICT).json({
      success: false,
      message: message,
      data: {},
    });
  }

  if (err instanceof Error.CastError) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: `Invalid value for ${err.path}`,
      data: {},
    });
  }

  if (err.name === "MongooseServerSelectionError") {
    return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
      success: false,
      message: err.message,
      data: {},
    });
  }

  return res
    .status(StatusCodes.INTERNAL_SERVER_ERROR)
    .json({ success: false, message: err.message, data: {} });
};
