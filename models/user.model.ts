import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import jwt, { Secret } from "jsonwebtoken";
import { Wallet } from "./wallet.model";
require("dotenv").config();

// Define the interface for the document
interface IUser extends Document {
  name: String;
  email: String;
  password: string;
  mobile: Number;
  gender: String;
  address: {
    addressLine1: String;
    addressLine2: String;
    area: String;
    areaCode: Number;
    city: String;
    cityId: Number;
  };
  wallet?: Schema.Types.ObjectId;
  wins: Number;
  losses: Number;
  isVerified: boolean;
  _originaIsVerified?: boolean;
  type: {
    type: String;
    enum: ["User", "System"];
    default: "User";
  };
  comparePassword: (password: String) => Promise<boolean>;
  SignAccessToken: () => Promise<string>;
  SignRefreshToken: () => Promise<string>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Please enter your name"],
    },
    email: {
      type: String,
      required: [true, "Please enter your valid email"],
      unique: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: {
      type: String,
      required: [true, "Please enter your password"],
    },
    mobile: {
      type: Number,
    },
    gender: {
      type: String,
      enum: ["Male", "Female"],
    },
    address: {
      addressLine1: String,
      addressLine2: String,
      area: String,
      areaCode: Number,
      city: String,
      cityId: Number,
    },
    wallet: {
      type: Schema.Types.ObjectId,
      ref: "Wallet", // Reference the Wallet schema name
    },
    wins: {
      type: Number,
      default: 0,
    },
    type: {
      type: String,
      enum: ["User", "System"],
      default: "User",
    },
    losses: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// hash the password before saving the user
userSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// create wallet when activating user
userSchema.pre<IUser>("save", async function (next) {
  if (this.isModified("isVerified") && this.isVerified) {
    const newWallet = await Wallet.create({ userId: this._id });
    this.wallet = newWallet._id;
  }
  next();
});

// sign access token
userSchema.methods.SignAccessToken = async function (): Promise<string> {
  return jwt.sign(
    { id: this._id },
    process.env.ACCESS_TOKEN || ("" as Secret),
    {
      expiresIn: "2d",
    }
  );
};

//sign refresh token

userSchema.methods.SignRefreshToken = async function (): Promise<string> {
  return jwt.sign(
    { id: this._id },
    process.env.REFRESH_TOKEN || ("" as Secret),
    { expiresIn: "6d" }
  );
};

// Define the comparePassword method
userSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

// Create the model
const User = mongoose.model<IUser>("User", userSchema);

export { User, IUser };
