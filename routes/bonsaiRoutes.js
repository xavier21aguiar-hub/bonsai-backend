import express from "express";
import { getWeather } from "../services/weatherService.js";
import { getRecommendations } from "../services/decisionEngine.js";
import { speciesData } from "../data/species.js";
import { getForecast } from "../services/weatherService.js";
import { evaluateForecast } from "../services/decisionEngine.js";
import { evaluateForecastTimeline, generateTimeDecisions } from "../services/decisionEngine.js";
import { Bonsai } from "../models/bonsai.js";
import { speciesRules } from "../data/speciesRules.js";

const router = express.Router();

router.get("/care", async (req, res) => {
  try {
    const { city, lat, lon, userId } = req.query;

    const climate = await getWeather(city, lat, lon);
    const forecast = await getForecast(city, lat, lon);

    let bonsaiQuery = {};
    if (userId) {
      bonsaiQuery.user = userId;
    }
    const bonsai = await Bonsai.findOne(bonsaiQuery).sort({ createdAt: -1 });

    const timeline = evaluateForecastTimeline(forecast);
    const timeDecisions = generateTimeDecisions(timeline);

    const forecastAlerts = evaluateForecast(forecast);

    let recommendations = [];

    let daysSinceWatering = null;
    const species = bonsai ? (speciesRules[bonsai.species] || speciesRules.juniper) : speciesRules.juniper;

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
      if(daysSinceWatering >= species.idealWaterDays){
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
            message: "⚠️ ¡Uy! Parece que a tus pequeñas les vendría bien un respiro de tanta agua",
            priority: "alta"
          });
        }

        if(avgInterval > 3){
          recommendations.push({
            action: "ALERTA",
            message: "🌵 Tu pequeño jardín está pidiendo agüita a gritos",
            priority: "alta"
          });
        }

        if(avgInterval >= 1 && avgInterval <= 3){
          recommendations.push({
            action: "OK",
            message: "✅ ¡Buen trabajo! Tienes un ritmo de riego excelente",
            priority: "baja"
          });
        }
      }
    }

    if (climate.humidity < 40 && climate.temperature > 18) {
      recommendations.push({
        action: "REGAR",
        message: "🌱 El clima está seco, ¡un buen día para refrescar tus plantas!",
        priority: "alta"
      });
    }

    if(climate.humidity > 80){
      recommendations.push({
        action: "NO REGAR",
        message: "🌧️ Hay bastante humedad hoy, mejor no regar",
        priority: "alta"
      });
    }

    if(climate.temperature < 8){
      recommendations.push ({
        action: "PROTEGER",
        message: "❄️ ¡Brrr! Mete tus plantitas para protegerlas del frío",
        priority: "alta"
      });
    }

    if (climate.temperature > 15) {
      recommendations.push({
        action: "SACAR",
        message: "☀️ Un lindo día para que tomen un poco de sol",
        priority: "media"
      });
    }

    if (climate.humidity < species.humidityPreference - 15) {
      recommendations.push({
        action: "HUMIDITY",
        message: `💧 A tu jardín le encantaría un ambiente un poquito más húmedo`,
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
        message: "❄️ El clima va a enfriar, ve buscando cobijo para tus amigas",
        priority: "alta"
      });
    }

    let finalTimeDecisions = [...timeDecisions];
    
    const shouldBlockWatering =
      finalRecommendations.some(r => r.action === "NO_REGAR");

      if (shouldBlockWatering) {
        finalTimeDecisions = finalTimeDecisions.map(decision => {
          
          if (decision.message.toLowerCase().includes("riega")) {
            return {
              ...decision,
              message: "🚫 Evita regar por ahora"
            };
          }
          return decision;
        });
      }

    let dailyInsight = "🌿 ¡Todo luce de maravilla en tu jardín hoy!";

    if (climate.temperature > species.heatTolerance) {
      dailyInsight = "🔥 Hace bastante calor, asegúrate de mantenerlas hidratadas";
    }
    
    if (climate.temperature < species.coldTolerance) {
      dailyInsight = "❄️ Día frío, mantén a tus amigas verdes bien abrigadas en el interior";
    }

    if (daysSinceWatering !== null && daysSinceWatering < 1) {
      dailyInsight = "💧 Recién hidratadas. ¡Tu jardín te lo agradece!";
    }

    if (daysSinceWatering !== null && daysSinceWatering > 3) {
      dailyInsight = "🌱 Dales un vistazo, puede que algunas ya tengan sed";
    }

    if (climate.humidity > 80) {
      dailyInsight = "🌧️ La humedad natural es como un spa gratis para tus plantas hoy";
    }

    if (climate.temperature > 32) {
      dailyInsight = "🔥 El sol está muy fuerte, búscales un lugarcito con sombra";
    }

    if (
      recommendations.some(r =>
      r.message.includes("respiro de tanta agua")
      ) 
    ) {
      dailyInsight = "⚠️ Ten cuidado de no ahogarlas, mejor dales un descansito de agua";
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

    if (bonsai) {
      let climateEffect = 0;
      
      // MUCHO CALOR
      if (climate.temperature > species.heatTolerance) {
        climateEffect -= 5;
      }

      // MUCHO FRÍO
      if (climate.temperature < species.coldTolerance) {
        climateEffect -= 8;
      }

      // HUMEDAD MUY BAJA
      if (climate.humidity < 25) {
        climateEffect -= 4;
      }

      // CLIMA IDEAL
      if (
        climate.temperature >= 18 &&
        climate.temperature <= 28 &&
        climate.humidity >= 40 &&
        climate.humidity <= 70
      ) {
        climateEffect += 2;
      }
      
      let updatedHealth = bonsai.health + climateEffect;

      // límites
      if (updatedHealth > 100) updatedHealth = 100;
      if (updatedHealth < 0) updatedHealth = 0;

      bonsai.health = updatedHealth;

      bonsai.healthHistory.push({
        value: updatedHealth,
        date: new Date()
      });

      await bonsai.save();
    }

    let healthPrediction = "🌿 Las raíces están felices, pronóstico muy favorable";

    if (daysSinceWatering !== null && daysSinceWatering > species.idealWaterDays + 1){
      healthPrediction = "📉 Ten cuidado, la falta de agua prolongada las pone tristes";
    }

    if ( recommendations.some(r => r.message.includes("respiro"))) {
      healthPrediction = "⚠️ Vigila no ahogar las raíces, podría causar problemas a largo plazo";
    }

    if (climate.temperature > 35) {
      healthPrediction = "🔥 Una ola de calor viene en camino, requerirán cuidados extra";
    }

    if (
      climate.temperature >= 18 &&
      climate.temperature <= 28 &&
      climate.humidity >= 40 &&
      climate.humidity <= 70
    ) {
      healthPrediction = "📈 ¡Clima perfecto! Ideal para que sigan creciendo radiantes";
    }

    const xp = bonsai?.xp || 0;

    const level = Math.floor(xp / 100) + 1;

    const nextLevelXP = level * 100;

    let gardenerTitle = "🌱 Jardinero Novato";

    if (level >= 3) {
      gardenerTitle = "🌿 Cuidador Experto";
    }

    if (level >= 5) {
      gardenerTitle = "🏆 Maestro Bonsái";
    }

    if (level >= 8) {
      gardenerTitle = "👑 Leyenda Botánica";
    }

    res.json({
      climate,
      recommendations: finalRecommendations,
      forecastTimeline: timeline,
      timeDecisions: finalTimeDecisions,
      dailyInsight,
      healthPrediction,
      xp,
      level,
      nextLevelXP,
      gardenerTitle,
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
    const { name, species, userId } = req.body;

    const now = new Date();

    const newBonsai = new Bonsai({
      user: userId,
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
  const { userId } = req.query;
  const query = userId ? { user: userId } : {};
  const bonsais = await Bonsai.find(query);
  res.json(bonsais);
});

router.post("/water", async (req, res) => {
  try {
    const { id } = req.body;
    const now = new Date();

    const bonsai = await Bonsai.findById(id);

    let healthChange = 8;
    let xpChange = 15;

    const hoursSinceWatering =
      (Date.now() - new Date(bonsai.lastWatered)) / (1000 * 60 * 60);

    const daysSinceWatering =
      hoursSinceWatering / 24;

    const species = speciesRules[bonsai.species] || speciesRules.juniper;

    /* Anti spam */
    if (hoursSinceWatering < 0.5) {
      return res.status(400).json({
        error: "La planta fue regada hace muy poco 🌱"
      });
    }

    /* Sobre-riego ligero */
    if (hoursSinceWatering >= 0.5 && hoursSinceWatering < 6){
      healthChange= -4;
      xpChange= -2;
    }

    /* Riego ideal */
    if (daysSinceWatering >= species.idealWaterDays - 1 && daysSinceWatering <= species.idealWaterDays + 1){
      healthChange= 10;
      xpChange= 20;
    }

    /* Planta muy seca */
    if (daysSinceWatering > species.idealWaterDays + 2){
      healthChange= -8;
      xpChange= -5;
    }

    let newHealth = bonsai.health + healthChange;

    let newXP = bonsai.xp + xpChange;
    if(newXP < 0) newXP = 0;

    //Limites
    if (newHealth > 100) newHealth = 100;
    if (newHealth < 0) newHealth = 0;

    const mood = newHealth >= 80
      ? "happy"
      : newHealth >= 50
        ? "normal"
        : "sad";
    
    let state = "normal";

    /* Creciendo */
    if (daysSinceWatering >= 1 &&
      daysSinceWatering <= 3 && newHealth >= 80
    ) {
      state= "growing";
    }

    /* Sedienta */
    if (daysSinceWatering >= species.idealWaterDays + 2) {
      state= "thirsty";
    }

    /* Sobre-riego */
    if (hoursSinceWatering >= 0.5 &&
      hoursSinceWatering < 6
    ) {
      state= "overwatered";
    }

    /* Descansando */
    if (daysSinceWatering < 1 &&
      newHealth >= 60
    ) {
      state = "resting";
    }

    /* Perfecta */
    if (newHealth >= 95 && daysSinceWatering >= species.idealWaterDays - 1 &&
      daysSinceWatering <= species.idealWaterDays
    ) {
      state = "perfect";
    }

    const updatedBonsai = await Bonsai.findByIdAndUpdate(
      id,
      { lastWatered: now,
        health: newHealth,
        xp: newXP,
        mood,
        state,
        $push: {
          wateringHistory: now,
          healthHistory: {
            value: newHealth,
            date: now
          }}
      },
      { new: true }
    );

    res.json(updatedBonsai);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error registrando riego" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Bonsai.findByIdAndDelete(id);
    res.json({ message: "Bonsái eliminado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar el bonsái" });
  }
});

export default router;