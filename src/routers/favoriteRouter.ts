import express from "express";
import FavoriteController from "@controllers/favoriteController";
import { authorize } from "@middlewares/authorization";
import { asyncHandler } from "@shared/asyncHandler";
const router = express.Router();

router.get("/", authorize, asyncHandler(FavoriteController.get));
router.post("/toggle/:id", authorize, asyncHandler(FavoriteController.toggle));

export default router;