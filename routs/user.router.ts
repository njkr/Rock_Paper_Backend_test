import express, { Router } from "express";
import {
  activateAccount,
  loginUser,
  logoutUser,
  registerUser,
  updateAccessToken,
  userDetails,
} from "../controllers/user.controller";
import { isAuthenticated } from "../middleware/auth";
const userRouter: Router = express.Router();

userRouter.post("/registerUser", registerUser);
userRouter.post("/activateUser", activateAccount);
userRouter.post("/loginUser", loginUser);
userRouter.get("/logoutUser", isAuthenticated, logoutUser);
userRouter.get("/userDetails", isAuthenticated, userDetails);
userRouter.get("/refresh", updateAccessToken);

export default userRouter;
