import express, { Router } from "express";
import { isAuthenticated } from "../middleware/auth";
import {
  cancel,
  deposit,
  success,
  webhook,
  withdraw,
} from "../controllers/wallet.controller";
const walletRouter: Router = express.Router();

walletRouter.post("/deposit", isAuthenticated, deposit);
walletRouter.post("/withdraw", isAuthenticated, withdraw);
walletRouter.get("/success", success);
walletRouter.get("/cancel", cancel);
// walletRouter.post("/webhook", webhook);

export default walletRouter;
