import express from "express";
import PrivacyController from "@controllers/privacyControllers";
import { admin_authorize, authorize, canAccessSettings } from "@middlewares/authorization";
import { asyncHandler } from "@shared/asyncHandler";

const router = express.Router();

router.post("/create", admin_authorize, canAccessSettings, asyncHandler(PrivacyController.create));
router.get("/", asyncHandler(PrivacyController.get));
router.patch("/update", admin_authorize, canAccessSettings, asyncHandler(PrivacyController.update));

export default router;