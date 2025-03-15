import mongoose, { Document, Schema } from "mongoose";
require("dotenv").config();

// Define the interface for the document
interface IWallet extends Document {
  userId: Schema.Types.ObjectId;
  balance: number;
  pendingDeposit: number;
  pendingWithdrawal: number;
  availableBalance: number;
  pendingTransactions: number;
  currency: string;
  payerEmailAddress: string | null;
  payerId: string;
  transactionHistory?: Schema.Types.ObjectId[];
}

const walletSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0.0,
    },
    pendingDeposit: {
      type: Number,
      default: 0.0,
    },
    pendingWithdrawal: {
      type: Number,
      default: 0.0,
    },
    availableBalance: {
      type: Number,
      default: 0.0,
    },
    pendingTransactions: {
      type: Number,
      default: 0.0,
    },
    currency: {
      type: String,
      default: "USD",
    },
    payerEmailAddress: {
      type: String || null,
      default: null,
    },
    payerId: {
      type: String,
      default: "",
    },
    transactionHistory: {
      type: [Schema.Types.ObjectId],
      ref: "Transaction", // Optional reference to Transaction schema
    },
  },
  { timestamps: true }
);

// Create the model
const Wallet = mongoose.model<IWallet>("Wallet", walletSchema);

export { Wallet, IWallet };
