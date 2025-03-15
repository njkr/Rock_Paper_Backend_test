import { Response } from "express";
import { IUser } from "../models/user.model";
import redis from "./redis";

require("dotenv").config();

interface ITokenOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: "lax" | "none" | "strict" | undefined;
  secure?: boolean;
}

const accessTokenExpires = parseInt(
  process.env.ACCESS_TOKEN_EXPIRY || "300",
  10
);

const refreshTokenExpires = parseInt(
  process.env.REFRESH_TOKEN_EXPIRY || "300",
  10
);

//option for cookies
export const accessTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + accessTokenExpires * 60 * 60 * 1000),
  maxAge: accessTokenExpires * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: "lax",
};

// refresh token options
export const refreshTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + refreshTokenExpires * 24 * 60 * 60 * 1000),
  maxAge: refreshTokenExpires * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: "lax",
};

export const sendToken = async (
  user: IUser,
  statusCode: number,
  res: Response
) => {
  const accessToken = await user.SignAccessToken();
  const refreshToken = await user.SignRefreshToken();

  // upload session to redis
  redis.set(user._id, JSON.stringify(user) as any);

  // only set secure in production
  if (process.env.NODE_ENV === "production") {
    accessTokenOptions.secure = true;
  }

  res.cookie("access_token", accessToken, accessTokenOptions);
  res.cookie("refresh_token", refreshToken, refreshTokenOptions);

  let userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    wallet: user.wallet,
  };
  res.status(statusCode).json({
    success: true,
    userData,
    accessToken,
    refreshToken,
  });
};
