import { NextFunction, Request, Response } from "express";
import { catchAsyncErrors } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import {
  Transaction,
  modeEnum,
  recipientEnum,
  statusEnum,
} from "../models/transaction.model";
import { Wallet } from "../models/wallet.model";
import {
  createPayment,
  executePayment,
  getPayoutDetails,
  sendPayout,
} from "../connector/paypal.connector";
require("dotenv").config();

export const deposit = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { amount, comment = "" } = req.body;
      const { _id: userId, email, name, wallet } = req.user;

      //check wallet exists
      const isWalletExists = await Wallet.find({ _id: wallet, userId });

      if (!isWalletExists[0]) {
        return next(new ErrorHandler("Wallet not found", 404));
      }

      let { id, links } = await createPayment(amount);

      let newTransaction = await new Transaction({
        mode: modeEnum.DEPOSIT,
        wallet,
        invoiceNo: id,
        amount,
        recipientType: recipientEnum.EXTERNAL,
        comment,
      });

      let Response = await newTransaction.save();

      let data = {
        id,
        links,
        amount,
        comment,
      };

      res.status(201).json({
        success: true,
        responeData: data,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const withdraw = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { amount, comment } = req.body;
      const { _id: userId, email, name, wallet } = req.user;

      //check wallet exists
      const [walletData] = await Wallet.find({ _id: wallet, userId });

      if (!walletData) {
        return next(new ErrorHandler("Wallet not found", 404));
      }

      if (walletData.availableBalance < amount) {
        return next(new ErrorHandler("Insufficient balance", 400));
      }

      let newTransaction = await Transaction.create({
        mode: modeEnum.WITHDRAWAL,
        wallet,
        invoiceNo: userId,
        amount,
        recipientType: recipientEnum.EXTERNAL,
        comment,
        fee: 10,
      });

      const payoutLink = await sendPayout(
        newTransaction._id,
        amount,
        walletData.payerEmailAddress
      );

      const completePayout = await getPayoutDetails(payoutLink as string);

      newTransaction.status = statusEnum.SUCCESS;
      let data = await newTransaction.save();

      res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const success = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { paymentId, token, PayerID } = req.query;

      let [transactionData] = await Transaction.find({
        invoiceNo: paymentId,
        status: statusEnum.PENDING,
      });

      if (!transactionData) {
        return next(new ErrorHandler("Transaction not found", 404));
      }

      let executePaymentResponse = await executePayment(
        String(paymentId),
        String(PayerID)
      );

      const {
        payer: {
          payer_info: { email },
        },
        transactions: [
          {
            related_resources: [{ sale }],
          },
        ],
      } = executePaymentResponse;

      const {
        transaction_fee: { value: fee },
      } = sale;

      let walletData = await Wallet.findById(transactionData.wallet);
      if (walletData.payerEmailAddress !== email) {
        walletData.payerEmailAddress = email;
        await walletData.save();
      }

      transactionData.status = statusEnum.SUCCESS;
      transactionData.fee = Number(fee);
      let data = await transactionData.save();

      res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const cancel = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { paymentId, token, PayerID } = req.query;

      let [transactionData] = await Transaction.find({
        invoiceNo: paymentId,
        status: statusEnum.PENDING,
      });

      if (!transactionData) {
        return next(new ErrorHandler("Transaction not found", 404));
      }

      transactionData.status = statusEnum.FAILED;
      let data = await transactionData.save();

      res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const webhook = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { transactionId, status } = req.body;
      const { _id: userId, email, name, wallet } = req.user;

      const [transactionData] = await Transaction.find({
        _id: transactionId,
        wallet,
      });

      if (transactionData) {
        return next(new ErrorHandler("transaction not found", 404));
      }

      transactionData.status = status;
      let Response = await transactionData.save();

      res.status(201).json({
        success: true,
        Response,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
