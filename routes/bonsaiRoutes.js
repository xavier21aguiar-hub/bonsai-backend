import express from "express";
import { getWeather } from "../services/weatherService.js";
import { getRecommendations } from "../services/decisionEngine.js";
import { speciesData } from "../data/species.js";
import { getForecast } from "../services/weatherService.js";
import { evaluateForecast } from "../services/decisionEngine.js";
import { evaluateForecastTimeline, generateTimeDecisions } from "../services/decisionEngine.js";
import { Bonsai } from "../models/bonsai.js";

const router = express.Router();

router.get("/care", async (req, res) => {
  try {
    const { city, lat, lon } = req.query;

    const climate = await getWeather(city, lat, lon);
    const forecast = await getForecast(city, lat, lon);

    const bonsai = await Bonsai.findOne().sort({ createdAt: -1 });

    const timeline = evaluateForecastTimeline(forecast);
    const timeDecisions = generateTimeDecisions(timeline);
    const forecastAlerts = evaluateForecast(forecast);

    let recommendations = [];

    let daysSinceWatering = null;

    if(bonsai){
      daysSinceWatering =
      (Date.now() - new Date(bonsai.lastWatered)) / (1000 * 60 * 60 * 24);

      const history = bonsai.wateringHistory || [];

      if (daysSinceWatering < 1){
        recommendations.push({
          action: "NO_REGAR",
          message: "💧 Ya regaste recientemente",
          priority: "alta"
        });
      }
      if(daysSinceWatering >= 2){
        recommendations.push({
          action: "REGAR",
          message: "🌱 Han pasado varios días — considera regar",
          priority: "alta"
        });
      }

    if (history.length >= 2) {
        // ordenar por fecha (por seguridad)
        const sorted = history.sort((a, b) => new Date(a) - new Date(b));

        // calcular diferencias entre riegos
        let intervals = [];
        
        for (let i = 1; i < sorted.length; i++) {
          const diff =
          (new Date(sorted[i]) - new Date(sorted[i - 1])) /
          (1000 * 60 * 60 * 24);

          intervals.push(diff);
        }
        
        // promedio de días entre riegos
        const avgInterval =
        intervals.reduce((a, b) => a + b, 0) / intervals.length;

        if(avgInterval < 1){
          recommendations.push({
            action: "ALERTA",
            message: "⚠️ Estás regando demasiado seguido",
            priority: "alta"
          });
        }

        if(avgInterval > 3){
          recommendations.push({
            action: "ALERTA",
            message: "🌵 Estás dejando secar demasiado la planta",
            priority: "alta"
          });
        }

        if(avgInterval >= 1 && avgInterval <= 3){
          recommendations.push({
            action: "OK",
            message: "✅ Buena frecuencia de riego",
            priority: "baja"
          });
        }
      }
    }

    if (climate.humidity < 40 && climate.temperature > 18) {
      recommendations.push({
        action: "REGAR",
        message: "🌱 Riega hoy — humedad baja",
        priority: "alta"
      });
    }

    if(climate.humidity > 80){
      recommendations.push({
        action: "NO REGAR",
        message: "🌧️ Alta humedad — evita riego",
        priority: "alta"
      });
    }

    if(climate.temperature < 8){
      recommendations.push ({
        action: "PROTEGER",
        message: "❄️ Riesgo de frío — mételo",
        priority: "alta"
      });
    }

    if (climate.temperature > 15) {
      recommendations.push({
        action: "SACAR",
        message: "☀️ Sácalo unas horas",
        priority: "media"
      });
    }

    let finalRecommendations = [...recommendations];

    //si ya no hay NO_REGAR por historial, elimina REGAR
    if(finalRecommendations.some(r => r.action === "NO_REGAR")){
      finalRecommendations = finalRecommendations.filter(
        r => r.action !== "REGAR"
      );
    }

    if (forecastAlerts.some(a => a.type === "RAIN_ALERT")) {
      finalRecommendations = finalRecommendations.filter(
        r => r.action !== "REGAR"
      );

      finalRecommendations.push({
        action: "NO_REGAR",
        message: "🌧️ Lloverá pronto — evita regar ahora",
        priority: "alta"
      });
    }

    if(forecastAlerts.some(alert => alert.type === "TEMP_ALERT")){
      finalRecommendations.push({
        action: "PROTEGER",
        message: "❄️ Bajará la temperatura — protege tu bonsái",
        priority: "alta"
      });
    }

    let healthScore = 100;

    if (daysSinceWatering !== null && daysSinceWatering < 0.5) {
      healthScore -= 20;
    }

    if (daysSinceWatering !== null && daysSinceWatering > 3) {
      healthScore -= 20;
    }

    if (climate.humidity < 30 || climate.humidity > 85) {
      healthScore -= 15;
    }

    if (climate.temperature < 5 || climate.temperature > 35) {
      healthScore -= 20;
    }

    if (forecastAlerts.some(a => a.type === "RAIN_ALERT")) {
      healthScore -= 10;
    }

    if (healthScore < 0) healthScore = 0;
    if (healthScore > 100) healthScore = 100;

    let healthStatus = "";

    if (healthScore >= 80) healthStatus = "🟢 Saludable";
    else if (healthScore >= 50) healthStatus = "🟡 Atención";
    else healthStatus = "🔴 Crítico";

    res.json({
      climate,
      recommendations: finalRecommendations,
      forecastTimeline: timeline,
      timeDecisions,
      health: {
        score: healthScore,
        status: healthStatus
      }
    });

  } catch (error) {
    console.error("ERROR REAL:", error);
    
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

router.post("/create", async (req, res) => {
  try {
    const { name, species } = req.body;

    const now = new Date();

    const newBonsai = new Bonsai({
      name,
      species,
      lastWatered: now,
      wateringHistory: [now],
      status: "bien"
    });

    await newBonsai.save();

    res.json(newBonsai);

  } catch (error) {
    console.error("ERROR REAL:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/all", async (req, res) => {
  const bonsais = await Bonsai.find();
  res.json(bonsais);
});

router.post("/water", async (req, res) => {
  try {
    const { id } = req.body;
    const now = new Date();

    const updatedBonsai = await Bonsai.findByIdAndUpdate(
      id,
      { lastWatered: now,
        $push: {wateringHistory: now}
      },
      { new: true }
    );

    res.json(updatedBonsai);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error registrando riego" });
  }
});

export default router;