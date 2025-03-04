import express from "express";
import TaCController from "@controllers/tacControllers";
import { asyncHandler } from "@shared/asyncHandler";
import { admin_authorize, canAccessSettings } from "@middlewares/authorization";

const router = express.Router();

router.post("/create", admin_authorize, canAccessSettings, asyncHandler(TaCController.create));
router.get("/", asyncHandler(TaCController.get));
router.patch("/update", admin_authorize, canAccessSettings, asyncHandler(TaCController.update));

export default router;