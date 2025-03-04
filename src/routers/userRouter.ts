import express from "express";
import UserController from "@controllers/userController";
import { admin_authorize, authorize, canAccessUser } from "@middlewares/authorization";
import fileUpload from "express-fileupload";
import fileHandler from "@middlewares/fileHandler";

const router = express.Router();

router.get("/get-all-users", admin_authorize, canAccessUser, UserController.getAllUsers);
router.get("/", authorize, UserController.get);
router.patch("/update", fileUpload(), fileHandler, authorize, UserController.update);

export default router;
