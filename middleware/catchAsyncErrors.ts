import { NextFunction, Request, Response } from "express";

export const catchAsyncErrors =
  (theFunction: any) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(theFunction(req, res, next)).catch(next);
  };
