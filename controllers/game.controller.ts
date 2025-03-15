import { NextFunction, Request, Response } from "express";
import { catchAsyncErrors } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import { IUser, User } from "../models/user.model";
import {
  gameConstantEnum,
  GameData,
  gameStatusEnum,
} from "../models/gameData.model";
import { Wallet } from "../models/wallet.model";
import mongoose from "mongoose";
require("dotenv").config();
// Create a new user

export const newGame = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      try {
        const { _id: userId, email, name, wallet } = req.user;
        const { betAmount, rounds } = req.body;

        // validate already on game

        let gameData = await GameData.findOne({
          playerOne: userId,
          status: gameStatusEnum.ONGOING,
        });

        if (gameData) {
          res.status(201).json({
            success: false,
            message: "Already on game",
            data: gameData,
          });
        } else {
          let playerOneWalletData = await Wallet.findById(wallet);

          if (playerOneWalletData.availableBalance < betAmount) {
            return next(new ErrorHandler("Insufficient balance", 400));
          }

          let botUser = await User.findById(process.env.SYSTEM_USER_ID);

          let data = await GameData.create({
            playerOne: userId,
            playerTwo: botUser._id,
            rounds,
            betAmountTotal: betAmount * 2,
          });

          res.status(201).json({
            success: true,
            data,
          });
        }
      } catch (error) {
        throw error;
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

function getRandomGameConstant(): gameConstantEnum {
  const values = Object.values(gameConstantEnum);
  const randomIndex = Math.floor(Math.random() * values.length);
  return values[randomIndex] as gameConstantEnum;
}

enum Move {
  ROCK = 0,
  PAPER = 1,
  SCISSORS = 2,
}
const moveMapping: { [key: string]: Move } = {
  rock: Move.ROCK,
  paper: Move.PAPER,
  scissors: Move.SCISSORS,
};
const determineWinner = (move1: Move, move2: Move): number => {
  const winMatrix: number[][] = [
    [0, 2], // Rock beats scissors
    [1, 0], // Paper beats rock
    [2, 1], // Scissors beats paper
  ];

  // Check if moves are the same
  if (move1 === move2) {
    return -1;
  }

  if (winMatrix[move1].includes(move2)) {
    return 1;
  } else {
    return 0;
  }
};

export const play = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { _id: userId, email, name, wallet } = req.user;
      const { gameId, move: playerOneMOve } = req.body;

      if (!mongoose.Types.ObjectId.isValid(gameId)) {
        return next(new ErrorHandler("Invalid Game Id", 400));
      }

      let gameData = await GameData.find({
        _id: gameId,
        playerOne: userId,
        status: gameStatusEnum.ONGOING,
      });

      if (!gameData || gameData.length === 0) {
        res.status(201).json({
          success: false,
          message: "no active game found pleae create new game",
        });
      }

      //validate
      if (moveMapping[playerOneMOve] === undefined) {
        return next(new ErrorHandler("Invalid Move", 400));
      }

      const playerTwoMove: gameConstantEnum = getRandomGameConstant();

      let botUser = await User.findById(process.env.SYSTEM_USER_ID);

      let gameDataNew = await GameData.findById(gameId);
      gameDataNew.completedRounds += 1;

      const winnerIndex = determineWinner(
        moveMapping[playerOneMOve],
        moveMapping[playerTwoMove]
      );

      const winnerName =
        winnerIndex === 1 ? name : winnerIndex === 0 ? botUser.name : "DRAW";

      gameDataNew.gameLog.push([playerOneMOve, playerTwoMove, winnerName]);

      const data = await gameDataNew.save();

      res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const getGameData = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { _id: userId, email, name, wallet } = req.user;
      const { gameId, move: playerOneMOve } = req.body;

      const data = await GameData.find({ playerOne: userId });

      res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
