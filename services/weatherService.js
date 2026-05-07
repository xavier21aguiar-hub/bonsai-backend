import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.WEATHER_API_KEY;

export const getForecast = async (city, lat, lon) => {
  let url = "";

  if (lat && lon) {
    url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  } else {
    url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`;
  }

  const response = await axios.get(url);

  return response.data.list; // lista de pronóstico (cada 3 horas)
};

export const getWeather = async (city, lat, lon) => {
  if (!API_KEY) {
    throw new Error("API KEY no definida");
  }

  let url = "";

  if (lat && lon) {
    url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  } else {
    url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;
  }

  console.log("URL:", url);

  const response = await axios.get(url);

  return {
    temperature: response.data.main.temp,
    humidity: response.data.main.humidity,
    rainProbability: response.data.clouds.all
  };
};

console.log("KEY EN SERVICE:", API_KEY);
console.log("KEY EN SERVICE:", process.env.WEATHER_API_KEY);