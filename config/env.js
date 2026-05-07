import dotenv from "dotenv";

dotenv.config();

export const ENV = {
  WEATHER_API_KEY: process.env.WEATHER_API_KEY
};