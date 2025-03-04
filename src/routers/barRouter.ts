import express from "express";
import { asyncHandler } from "@shared/asyncHandler";
import BarController from "@controllers/barControllers";
import { admin_authorize, authorize, canAccessBar } from "@middlewares/authorization";
import fileUpload from "express-fileupload";
import fileHandler from "@middlewares/fileHandler";

const router = express.Router();

router.post("/create", admin_authorize, canAccessBar, fileUpload(), fileHandler, asyncHandler(BarController.create));
router.get("/search-bar", asyncHandler(BarController.mapSearch));
router.get("/get-all-bars", admin_authorize, canAccessBar, asyncHandler(BarController.getAllBars));
router.get("/:id", asyncHandler(BarController.getById));
router.patch("/update/:id", admin_authorize, canAccessBar, fileUpload(), fileHandler, asyncHandler(BarController.update));
router.delete("/delete/:id", admin_authorize, canAccessBar,asyncHandler(BarController.remove));
export default router;
