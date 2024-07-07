import { NextFunction, Request, Response } from "express";
import { catchAsyncErrors } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import { IUser, User } from "../models/user.model";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import sendMail from "../utils/sendMail";
import {
  accessTokenOptions,
  refreshTokenOptions,
  sendToken,
} from "../utils/jwt";
import redis from "../utils/redis";
import {
  Transaction,
  modeEnum,
  recipientEnum,
  statusEnum,
} from "../models/transaction.model";
import { model } from "mongoose";
import { getAccessToken } from "../connector/paypal.connector";
require("dotenv").config();
// Create a new user

interface IRegisterUserBody {
  name: string;
  email: string;
  password: string;
}

interface IActivationToken {
  activationToken: string;
  activationCode: string;
}

export const registerUser = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;

      const isEmailExist = await User.findOne({ email });

      if (isEmailExist) {
        return next(new ErrorHandler("Email already exists", 400));
      }

      const user: IRegisterUserBody = {
        name,
        email,
        password,
      };

      const activatedToken = createActivationToken(user);
      const { activationToken, activationCode } = activatedToken;

      try {
        // await sendMail({
        //   email,
        //   subject: "Account Activation",
        //   template: "activation.mail.ejs",
        //   data: { name, activationCode },
        // });

        res.status(201).json({
          success: true,
          message: "please check your email to activate your account",
          activationToken,
          activationCode,
        });
      } catch (error) {
        throw error;
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const createActivationToken = (user: any): IActivationToken => {
  const activationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const activationToken = jwt.sign(
    { user, activationCode },
    process.env.ACTIVATION_SECRET as Secret,
    {
      expiresIn: "5m",
    }
  );
  return { activationToken, activationCode };
};

interface IActivationRequest {
  activationToken: string;
  activationCode: string;
}

// activate user account
export const activateAccount = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activationToken, activationCode } =
        req.body as IActivationRequest;

      const newUser: { user: IUser; activationCode: string } = jwt.verify(
        activationToken,
        process.env.ACTIVATION_SECRET as Secret
      ) as { user: IUser; activationCode: string };

      if (newUser.activationCode !== activationCode.toString()) {
        return next(new ErrorHandler("Invalid activation code", 400));
      }

      const { name, email, password } = newUser.user;

      const existsUser = await User.findOne({ email });

      if (existsUser) {
        return next(new ErrorHandler("User already exists", 400));
      }

      const user = await User.create({
        name,
        email,
        password,
        role: "user",
        isVerified: true,
      });

      res.status(201).json({
        success: true,
        message: "Account activated successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Login user

interface ILoginRequest {
  email: string;
  password: string;
}

export const loginUser = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as ILoginRequest;

      if (!email || !password) {
        return next(new ErrorHandler("Please enter email & password", 400));
      }

      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("Invalid Email or Password", 401));
      }

      const isPasswordMatched = await user.comparePassword(password);

      if (!isPasswordMatched) {
        return next(new ErrorHandler("Invalid Email or Password", 401));
      }

      sendToken(user, 200, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Logout user
export const logoutUser = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user._id;
      res.cookie("access_token", "", {
        maxAge: 1,
      });

      res.cookie("refresh_token", "", {
        maxAge: 1,
      });

      await redis.del(userId);
      res.status(200).json({
        success: true,
        message: "Logged out",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// getUserDetails
export const userDetails = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user._id;

      let userDetails = await User.findById(userId)
        .populate({
          path: "wallet",
          populate: {
            path: "transactionHistory",
            model: Transaction,
          },
        })
        .select("-password");

      res.status(200).json({
        status: "success",
        userDetails,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// update access token
export const updateAccessToken = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let refresh_token = req.cookies.refresh_token as string;

      if (!refresh_token) {
        return next(
          new ErrorHandler("Please login to access this resource", 401)
        );
      }

      const decoded = jwt.verify(
        refresh_token,
        process.env.REFRESH_TOKEN as Secret
      ) as JwtPayload;

      const session = await redis.get(decoded.id);

      if (!session) {
        return next(
          new ErrorHandler("Please login to access this resource", 401)
        );
      }

      const user = JSON.parse(session);

      const accessToken = jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN as Secret,
        { expiresIn: "5m" }
      );

      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN as Secret,
        {
          expiresIn: "3d",
        }
      );

      res.cookie("access_token", accessToken, accessTokenOptions);

      res.cookie("refresh_token", refreshToken, refreshTokenOptions);

      res.status(200).json({
        status: "success",
        accessToken,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
