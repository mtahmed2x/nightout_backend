import { model, Model, Schema, Document } from "mongoose";
import * as readline from "node:readline";
import bcrypt from "bcrypt";
import { logger } from "@shared/logger";
import { AdminRole } from "@shared/enums";
import generateOTP from "@utils/generateOTP";
import { generateToken } from "@utils/jwt";

export type DecodedAdmin = {
  id: string;
  email: string;
  role: AdminRole;
};

export type AdminSchema = Document & {
  userName: string;
  email: string;
  password: string;
  role: AdminRole;
  phoneNumber: string;
  address: string;
  avatar: string;
  recoveryOTP: string;
  recoveryOTPExpiredAt: Date | null;
  comparePassword(password: string): Promise<boolean>;
  generateRecoveryOTP(): void;
  clearRecoveryOTP(): void;
  isCorrectRecoveryOTP(otp: string): boolean;
  isRecoveryOTPExpired(): boolean;
};

const adminSchema = new Schema<AdminSchema>({
  userName: {
    type: String,
    required: true,
    default: "admin",
  },
  email: {
    type: String,
    required: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: Object.values(AdminRole),
    required: true,
  },
  phoneNumber: {
    type: String,
    default: "",
  },
  address: {
    type: String,
    default: "",
  },
  avatar: {
    type: String,
    default: "",
  },
  recoveryOTP: String,
  recoveryOTPExpiredAt: Date,
});


adminSchema.methods.comparePassword = async function (password: string) {
  return bcrypt.compare(password, this.password);
};

adminSchema.methods.generateRecoveryOTP = function (): void {
  this.recoveryOTP = generateOTP();
  this.recoveryOTPExpiredAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
};

adminSchema.methods.clearRecoveryOTP = function (): void {
  this.recoveryOTP = "";
  this.recoveryOTPExpiredAt = null;
};

adminSchema.methods.isCorrectRecoveryOTP = function (otp: string): boolean {
  return this.recoveryOTP === otp;
};

adminSchema.methods.isRecoveryOTPExpired = function (): boolean {
  return this.recoveryOTPExpiredAt !== null && this.recoveryOTPExpiredAt < new Date();
};


adminSchema.statics.findByEmail = async function (email: string): Promise<AdminSchema | null> {
  return this.findOne({ email }).exec();
};

adminSchema.statics.findByEmailWithoutPassword = async function (email: string): Promise<AdminSchema | null> {
  return this.findOne({ email }).select('-password').exec();
};

adminSchema.statics.generateAccessToken = function (id: string): string {
  return generateToken(id, process.env.JWT_ACCESS_SECRET!);
};

adminSchema.statics.findOrCreate = async function (): Promise<void> {
  const admin = await this.findOne();
  if (!admin) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const email = await new Promise<string>((resolve) => {
      rl.question("Enter email address: ", (answer) => resolve(answer));
    });

    const password = await new Promise<string>((resolve) => {
      rl.question("Enter password: ", (answer) => resolve(answer));
    });

    rl.close();

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.create({
      userName: "admin",
      email,
      password: hashedPassword,
      role: AdminRole.All,
    });

    logger.info("admin created successfully");
  } else {
    logger.info("admin account exists");
  }
};

adminSchema.pre<AdminSchema>("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});


type AdminModel = Model<AdminSchema> & {
  findByEmail(email: string): Promise<AdminSchema | null>;
  findByEmailWithoutPassword(email: string): Promise<AdminSchema | null>
  findOrCreate(): Promise<void>;
  generateAccessToken(id: string): string;
};
const Admin = model<AdminSchema, AdminModel>("Admin", adminSchema);
export default Admin;
