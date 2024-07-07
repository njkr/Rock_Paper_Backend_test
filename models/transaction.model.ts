import mongoose, { Document, Schema } from "mongoose";
import { Wallet } from "./wallet.model";
require("dotenv").config();

enum recipientEnum {
  USER = "user",
  EXTERNAL = "external",
}

enum modeEnum {
  DEPOSIT = "deposit",
  WITHDRAWAL = "withdrawal",
  TRANSFER = "transfer",
}

enum statusEnum {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
}

interface ITransaction extends Document {
  mode: modeEnum;
  wallet: mongoose.Schema.Types.ObjectId; // Reference to the Wallet document
  invoiceNo: String | mongoose.Schema.Types.ObjectId;
  recipient: String | mongoose.Schema.Types.ObjectId | null;
  recipientType: recipientEnum;
  amount: number;
  fee: number;
  status: statusEnum;
  _originalStatus?: statusEnum;
  comment?: string;
}

const transactionSchema = new Schema<ITransaction>(
  {
    mode: {
      type: String,
      enum: modeEnum,
      required: true,
    },
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    invoiceNo: {
      type: String || mongoose.Schema.Types.ObjectId,
    },
    recipient: {
      type: String || mongoose.Schema.Types.ObjectId || null,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.0,
    },
    recipientType: {
      type: String,
      enum: recipientEnum,
      required: true,
    },
    fee: {
      type: Number,
      required: true,
      default: 0.0,
    },
    status: {
      type: String,
      enum: statusEnum,
      required: true,
      default: statusEnum.PENDING,
    },
    comment: {
      type: String,
    },
  },
  { timestamps: true }
);

// Pre-save middleware to update wallet transactionHistory and perform balance calculations
transactionSchema.pre("save", async function (next) {
  const transaction = this;
  const walletId = transaction.wallet;

  if (transaction.isNew || transaction.isModified("status")) {
    const wallet = await Wallet.findById(walletId);

    if (!wallet) {
      throw new Error("Wallet not found for transaction.");
    }

    let balanceImpact = transaction.amount;

    switch (transaction.mode) {
      case modeEnum.DEPOSIT:
        wallet.balance =
          transaction.status === statusEnum.PENDING
            ? wallet.balance + balanceImpact
            : transaction.status === statusEnum.FAILED
            ? wallet.balance - balanceImpact
            : wallet.balance - transaction.fee;
        wallet.pendingDeposit =
          transaction.status === statusEnum.PENDING
            ? wallet.pendingDeposit + balanceImpact
            : wallet.pendingDeposit - balanceImpact;
        wallet.availableBalance =
          transaction.status === statusEnum.SUCCESS
            ? wallet.availableBalance + balanceImpact - transaction.fee
            : wallet.availableBalance;
        break;
      case modeEnum.WITHDRAWAL:
        wallet.balance =
          transaction.status === statusEnum.SUCCESS
            ? wallet.balance - balanceImpact - transaction.fee
            : wallet.balance;
        wallet.pendingWithdrawal =
          transaction.status === statusEnum.PENDING
            ? wallet.pendingWithdrawal + balanceImpact + transaction.fee
            : wallet.pendingWithdrawal - balanceImpact - transaction.fee;
        wallet.availableBalance =
          transaction.status === statusEnum.PENDING
            ? wallet.availableBalance - balanceImpact - transaction.fee
            : transaction.status === statusEnum.FAILED
            ? wallet.availableBalance + balanceImpact + transaction.fee
            : wallet.availableBalance;
        break;
    }
    !wallet.transactionHistory.includes(
      transaction._id as unknown as mongoose.Schema.Types.ObjectId
    ) &&
      wallet.transactionHistory.push(
        transaction._id as unknown as mongoose.Schema.Types.ObjectId
      );
    await wallet.save();
  }

  next();
});

// Create the model
const Transaction = mongoose.model<ITransaction>(
  "Transaction",
  transactionSchema
);

export { Transaction, ITransaction, recipientEnum, modeEnum, statusEnum };
