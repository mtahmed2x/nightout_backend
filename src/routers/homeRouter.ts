import HomeController from "@controllers/homeController";
import express from "express";
import { asyncHandler } from "@shared/asyncHandler";
import { authorize } from "@middlewares/authorization";

const router = express.Router();

router.get("/", authorize, asyncHandler(HomeController.home));

export default router;