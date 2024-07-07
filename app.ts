import cookieParser from "cookie-parser";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { ErrorHandlerMiddleware } from "./middleware/error";
import userRouter from "./routs/user.router";
import walletRouter from "./routs/wallet.router";
import gameRouter from "./routs/game.router";
export const app = express();
require("dotenv").config();
require("./utils/bot");

app.use(express.json({ limit: "5mb" }));

// cp
app.use(cookieParser());
// cors
app.use(
  cors({
    origin: process.env.ORIGIN || "http://localhost:3000",
  })
);

app.use("/api/v1/user", userRouter);
app.use("/api/v1/wallet", walletRouter);
app.use("/api/v1/game", gameRouter);
// testing api
app.get("/test", (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    success: true,
    message: "Hello from server",
  });
});

app.all("*", (req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    success: false,
    message: "Page not found",
  });
});

app.use(ErrorHandlerMiddleware);
