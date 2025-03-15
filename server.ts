import { app } from "./app";
import { connectToDatabase } from "./utils/db";
import redis from "./utils/redis";
require("dotenv").config();
// cs

app.listen(process.env.PORT, () => {
  console.log("server is connected with port", process.env.PORT);
  connectToDatabase();
});
