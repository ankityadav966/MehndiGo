const { UserRepository, OtpRepository } = require("../repositories/index");

const AppError = require("../utils/errors/app.error");

const { generateToken } = require("../utils/jwt");
const { sendOtp } = require("../utils/twilio.service");
const UserRepositor = new UserRepository();
const OtpRepositor = new OtpRepository();

class UserService {
  async sendOtp(data) {
    console.log("Data received in service:", data);

    const { name, phone, role } = data;

    if (!phone) {
      throw new AppError("Phone number required", 400);
    }

  
let user = await UserRepositor.getOne({
  phone,
});

if (user) {

  if (user.role !== role) {

    throw new AppError(
      `This phone number is already registered as ${user.role}`,
      400
    );
  }

} else {

  user = await UserRepositor.create({
    name,
    phone,
    role: role || "USER",
  });
}


    const otp = Math.floor(100000 + Math.random() * 900000);

    await OtpRepositor.create({
      user_id: user.id,

      phone,

      otp,

      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendOtp(phone, otp);

    return {
      phone,
      role: user.role,
      otp,
    };
  }

  async verifyOtp(data) {
    const { phone, otp, role } = data;

    const otpData = await OtpRepositor.getOne({
      phone,

      otp,

      verified: false,
    });

    if (!otpData) {
      throw new AppError("Invalid OTP", 400);
    }

    if (new Date(otpData.expires_at) < new Date()) {
      throw new AppError("OTP Expired", 400);
    }

    await OtpRepositor.update(otpData.id, {
      verified: true,
    });

    const user = await UserRepositor.getOne({ phone });
    
if (!user) {

  throw new AppError(
    "User not found",
    404
  );
}

if (user.role !== role) {

  throw new AppError(
    `This number belongs to ${user.role}`,
    400
  );
}


    await UserRepositor.update(user.id, {
      last_login_at: new Date(),
    });


const token =
  generateToken({

    id: user.id,

    role: user.role,
  });


    return {
      token,

      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    };
  }

async login(data) {

  const {
    phone,
    role,
  } = data;

  if (!phone) {

    throw new AppError(
      "Phone number required",
      400
    );
  }

  if (!role) {

    throw new AppError(
      "Role required",
      400
    );
  }

  const user =
    await UserRepositor.getOne({
      phone,
    });

  if (!user) {

    throw new AppError(
      "User not found",
      404
    );
  }

  if (
    user.role !== role
  ) {

    throw new AppError(
      `This number is registered as ${user.role}`,
      400
    );
  }

  const otp =
    Math.floor(
      100000 +
      Math.random() *
      900000
    );

  await OtpRepositor.create({

    user_id:
      user.id,

    phone,

    otp,

    expires_at:
      new Date(
        Date.now() +
        5 * 60 * 1000
      ),
  });

  await sendOtp(
    phone,
    otp
  );

  return {

    phone,

    role,
  };
}


  async getProfile(id) {
    const user = await UserRepositor.getById(id);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }
  async getArtists(query) {
    return await UserRepositor.getArtists(query);
  }
}

module.exports = new UserService();
