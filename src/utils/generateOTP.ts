import crypto from "crypto";

const generateOTP = (length = Number.parseInt(process.env.OTP_LENGTH!)) => {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, digits.length);
    otp += digits[randomIndex];
  }
  return otp;
};

export default generateOTP;
