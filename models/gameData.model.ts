import mongoose, { Document, Schema } from "mongoose";
import { Wallet } from "./wallet.model";
import { User } from "./user.model";
import {
  Transaction,
  modeEnum,
  recipientEnum,
  statusEnum,
} from "./transaction.model";
require("dotenv").config();

enum gameStatusEnum {
  ONGOING = "ongoing",
  COMPLETED = "completed",
}

enum gameConstantEnum {
  ROCK = "rock",
  PAPER = "paper",
  SCISSORS = "scissors",
}

interface IGameData extends Document {
  playerOne: mongoose.Schema.Types.ObjectId;
  _originalPlayerOne?: mongoose.Schema.Types.ObjectId;
  playerTwo: mongoose.Schema.Types.ObjectId;
  _originalPlayerTwo?: mongoose.Schema.Types.ObjectId;
  gameLog: Array<[gameConstantEnum, gameConstantEnum, String]>;
  betAmountTotal: number;
  _originalBetAmountTotal?: number;
  rounds: number;
  completedRounds: number;
  winner: mongoose.Schema.Types.ObjectId | null;
  looser: mongoose.Schema.Types.ObjectId | null;
  status: gameStatusEnum;
  comment: string;
}

const gameDataSchema = new Schema<IGameData>(
  {
    playerOne: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    playerTwo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    gameLog: Array<[gameConstantEnum, gameConstantEnum, String]>,
    betAmountTotal: {
      type: Number,
      required: true,
    },
    rounds: {
      type: Number,
      required: true,
    },
    completedRounds: {
      type: Number,
      default: 0,
      required: true,
    },
    winner: mongoose.Schema.Types.ObjectId || null,
    looser: mongoose.Schema.Types.ObjectId || null,
    status: {
      type: String,
      enum: gameStatusEnum,
      default: gameStatusEnum.ONGOING,
    },
    comment: String,
  },
  { timestamps: true }
);

type Move =
  | gameConstantEnum.ROCK
  | gameConstantEnum.PAPER
  | gameConstantEnum.SCISSORS;

function determineRoundResult(move1: Move, move2: Move): string {
  if (move1 === move2) {
    return "draw";
  }
  if (
    (move1 === gameConstantEnum.ROCK && move2 === gameConstantEnum.SCISSORS) ||
    (move1 === gameConstantEnum.SCISSORS && move2 === gameConstantEnum.PAPER) ||
    (move1 === gameConstantEnum.PAPER && move2 === gameConstantEnum.ROCK)
  ) {
    return "player1";
  } else {
    return "player2";
  }
}

function determineFinalWinner(moves: [Move, Move][]): number {
  let playerOneWins = 0;
  let playerTwoWins = 0;

  moves.forEach(([move1, move2]) => {
    const result = determineRoundResult(move1, move2);
    if (result === "player1") {
      playerOneWins++;
    } else if (result === "player2") {
      playerTwoWins++;
    }
  });

  if (playerOneWins > playerTwoWins) {
    return 1;
  } else if (playerTwoWins > playerOneWins) {
    return 0;
  } else {
    return -1;
  }
}

gameDataSchema.pre("save", async function (next) {
  const gameData = this;

  if (gameData.isNew) {
    const playerOne = await User.findById(gameData.playerOne).populate(
      "wallet"
    );
    const playerTwo = await User.findById(gameData.playerTwo).populate(
      "wallet"
    );

    if (!playerOne || !playerTwo) {
      throw new Error("User not found");
    }

    if (gameData.betAmountTotal <= 0) {
      throw new Error("Bet amount must be greater than 0");
    }

    //insert transaction
    const [playerOneTransaction, playerTwoTransaction] =
      await Transaction.insertMany([
        {
          mode: modeEnum.TRANSFER,
          wallet: playerOne.wallet,
          invoiceNo: gameData._id,
          recipient: null,
          recipientType: recipientEnum.USER,
          amount: gameData.betAmountTotal / 2,
        },
        {
          mode: modeEnum.TRANSFER,
          wallet: playerTwo.wallet,
          invoiceNo: gameData._id,
          recipient: null,
          recipientType: recipientEnum.USER,
          amount: gameData.betAmountTotal / 2,
        },
      ]);

    const playerOneWallet = await Wallet.findById(playerOne.wallet);
    const playerTwoWallet = await Wallet.findById(playerTwo.wallet);

    playerOneWallet.availableBalance -= playerOneTransaction.amount;
    playerTwoWallet.availableBalance -= playerTwoTransaction.amount;

    playerOneWallet.pendingTransactions += playerOneTransaction.amount;
    playerTwoWallet.pendingTransactions += playerTwoTransaction.amount;

    playerOneWallet.transactionHistory.push(playerOneTransaction._id);

    playerTwoWallet.transactionHistory.push(playerTwoTransaction._id);

    await Promise.all([playerOneWallet.save(), playerTwoWallet.save()]);
  }

  if (gameData.isModified("completedRounds")) {
    if (gameData.completedRounds === gameData.rounds) {
      const gameMoves: [Move, Move][] = gameData.gameLog.map((x) => [
        x[0] as Move,
        x[1] as Move,
      ]);
      const winnerIndex = determineFinalWinner(gameMoves);

      const gameWinner =
        winnerIndex === 1
          ? gameData.playerOne
          : winnerIndex === 0
          ? gameData.playerTwo
          : gameData.playerOne;
      const gameLooser =
        gameWinner === gameData.playerOne
          ? gameData.playerTwo
          : gameWinner === gameData.playerTwo
          ? gameData.playerOne
          : gameData.playerTwo;

      // winner logic
      const winner = await User.findById(gameWinner);
      const looser = await User.findById(gameLooser);

      const winnerWallet = await Wallet.findById(winner.wallet);
      const looserWallet = await Wallet.findById(looser.wallet);

      // assume player one is winner
      const winnerTransaction = await Transaction.findOne({
        invoiceNo: gameData._id,
        wallet: winner.wallet,
      });

      const looserTransaction = await Transaction.findOne({
        invoiceNo: gameData._id,
        wallet: looser.wallet,
      });

      if (winnerIndex !== -1) {
        winner.wins = Number(winner.wins) + 1;
        looser.losses = Number(looser.losses) + 1;
      }
      if (winnerIndex !== -1) {
        winnerWallet.pendingTransactions -= Number(winnerTransaction.amount);
        winnerWallet.availableBalance +=
          Number(winnerTransaction.amount) + Number(looserTransaction.amount);
        winnerWallet.balance += Number(winnerTransaction.amount);

        looserWallet.pendingTransactions -= Number(looserTransaction.amount);
        looserWallet.balance -= Number(looserTransaction.amount);
      } else {
        winnerWallet.pendingTransactions -= winnerWallet.pendingTransactions;
        winnerWallet.availableBalance += winnerWallet.availableBalance;

        looserWallet.pendingTransactions -= looserWallet.pendingTransactions;
        looserWallet.availableBalance += looserWallet.availableBalance;
      }
      // update transaction
      winnerTransaction.status = statusEnum.SUCCESS;
      looserTransaction.status = statusEnum.SUCCESS;

      winnerTransaction.recipient = winner.name;
      looserTransaction.recipient =
        winnerIndex !== -1 ? winner.name : looser.name;

      const winnerString = winnerIndex !== -1 ? "win against" : "draw against";
      const looserString =
        winnerIndex !== -1 ? "loose against" : "draw against";

      winnerTransaction.comment = winnerTransaction.comment
        ? `${winnerString} | ` + looser.name
        : winnerTransaction.comment + ` | ${winnerString} | ` + looser.name;

      looserTransaction.comment = looserTransaction.comment
        ? `${looserString} | ` + winner.name
        : looserTransaction.comment + ` | ${looserString} | ` + winner.name;

      gameData.status = gameStatusEnum.COMPLETED;
      gameData.winner = winnerIndex !== -1 ? winner._id : null;
      gameData.looser = winnerIndex !== -1 ? looser._id : null;

      await Promise.all([
        winner.save(),
        winnerWallet.save(),
        winnerTransaction.save(),
        looser.save(),
        looserWallet.save(),
        looserTransaction.save(),
      ]);
    }
  }

  next();
});

// Create the model
const GameData = mongoose.model<IGameData>("GameData", gameDataSchema);

export { GameData, IGameData, gameStatusEnum, gameConstantEnum };
