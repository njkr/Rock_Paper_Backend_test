import Redis from "ioredis";
require("dotenv").config();

// Create a new Redis client
const redis = new Redis(process.env.REDIS_URL);

// Test the connection
redis.ping((err, result) => {
  if (err) {
    console.error("Error connecting to Redis:", err);
  } else {
    console.log("Successfully connected to Redis");
  }
});

// Export the Redis client
export default redis;
