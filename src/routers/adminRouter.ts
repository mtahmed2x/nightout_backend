import express from "express";
import {
  admin_authorize,
  canAccessAdministrator,
  canAccessDashboard,
  canAccessSettings,
  canAccessUser
} from "@middlewares/authorization";
import { asyncHandler } from "@shared/asyncHandler";
import AdminServices from "@services/adminSevices";
import fileHandler from "@middlewares/fileHandler";
import fileUpload from "express-fileupload";

const router = express.Router();

// Auth
router.post("/login", asyncHandler(AdminServices.login));
router.post("/recovery", asyncHandler(AdminServices.recovery));
router.post("/recovery-verification", asyncHandler(AdminServices.recoveryVerification));
router.post("/reset-password", asyncHandler(AdminServices.resetPassword));
router.post("/change-password", admin_authorize, canAccessSettings, asyncHandler(AdminServices.changePassword));

// Dashboard
router.get("/analytics", admin_authorize, canAccessDashboard, asyncHandler(AdminServices.analytics));
router.get("/get-yearly-user-growth", admin_authorize, canAccessDashboard, asyncHandler(AdminServices.getYearlyUserGrowth));
router.get("/get-weekly-user-growth", admin_authorize, canAccessDashboard, asyncHandler(AdminServices.getWeeklyUserGrowth));

// User
router.post("/block-toggle/:id", admin_authorize, canAccessUser, asyncHandler(AdminServices.blockUserToggle));

// Administrator
router.post("/create", admin_authorize, canAccessAdministrator, fileUpload(), fileHandler, asyncHandler(AdminServices.create));
router.patch("/update/:id", admin_authorize, canAccessAdministrator, fileUpload(), fileHandler, asyncHandler(AdminServices.updateAdmin));
router.delete("/delete/:id", admin_authorize, canAccessAdministrator, asyncHandler(AdminServices.removeAdminById));
router.get("/get-all-admins", admin_authorize, canAccessAdministrator, asyncHandler(AdminServices.getAllAdmins));

// Profile
router.patch("/update", admin_authorize, fileUpload(), fileHandler, asyncHandler(AdminServices.updateAdmin));
router.get("/", admin_authorize, asyncHandler(AdminServices.getAdminInfo));

export default router;
