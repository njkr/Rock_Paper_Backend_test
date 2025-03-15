import express, { Router } from "express";

import { isAuthenticated } from "../middleware/auth";
import { getGameData, newGame, play } from "../controllers/game.controller";
const gameRouter: Router = express.Router();

gameRouter.post("/newGame", isAuthenticated, newGame);
gameRouter.post("/play", isAuthenticated, play);
gameRouter.get("/data", isAuthenticated, getGameData);

export default gameRouter;
