export const getRecommendations = (climate, species, bonsai) => {
  const rules = [
    {
    name: "Evitar riego por humedad alta",
    condition: () =>
      climate.humidity > species.maxHumidity && climate.rainProbability > 60,
    action: {
      type: "NO_REGAR",
      message: "🌧️ Alta humedad y lluvia — evita regar",
      impact: "agua"
    },
    priority: 1,
    score: -3
  },
  {
    name: "Riego necesario",
    condition: () =>
      bonsai.soilDry && climate.temperature > 18,
    action: {
      type: "REGAR",
      message: "🌱 Tierra seca y clima cálido — riega hoy",
      impact: "agua"
    },
    priority: 2,
    score: 3
  },
  {
    name: "Protección por frío",
    condition: () =>
      climate.temperature < species.minTemp,
    action: {
      type: "PROTEGER",
      message: "❄️ Temperatura baja — mete el bonsái",
      impact: "riesgo"
    },
    priority: 1,
    score: 4
  },
  {
    name: "Exposición al sol",
    condition: () =>
      species.type === "outdoor" && climate.temperature > 15,
    action: {
      type: "SACAR",
      message: "☀️ Buen clima — sácalo unas horas",
      impact: "sol"
    },
    priority: 3,
    score: 2
  }
];

  // Ejecutar reglas
  const results = rules
    .filter(rule => rule.condition())
    .sort((a, b) => a.priority - b.priority);

  // Evitar conflictos (ej: REGAR vs NO REGAR)
  const actions = [];
  let hasWaterDecision = false;

  for (let rule of results) {
    if (rule.action.impact === "agua") {
      if (hasWaterDecision) continue;
      hasWaterDecision = true;
    }
    actions.push({
      ...rule.action,
      priority: rule.priority,
      score: rule.score
    });
  }

  return actions;
};

export const evaluateForecast = (forecastList) => {
  let alerts = [];

  for (let slot of forecastList.slice(0, 5)) { // próximas ~15 horas
    const temp = slot.main.temp;
    const rain = slot.pop || 0; // probabilidad lluvia

    if (rain > 0.3) {
      alerts.push({
        type: "RAIN_ALERT",
        message: "🌧️ Lluvia en próximas horas — evita regar"
      });
    }

    if (temp < 8) {
      alerts.push("❄️ Bajará la temperatura — protege el bonsái");
      break;
    }
  }

  return alerts;
};

export const evaluateForecastTimeline = (forecastList) => {
  const timeline = {
    morning: [],
    afternoon: [],
    night: []
  };

  forecastList.slice(0, 8).forEach(slot => {
    const date = new Date(slot.dt * 1000);
    const hour = date.getHours();

    let period = "";

    if (hour >= 6 && hour < 12) period = "morning";
    else if (hour >= 12 && hour < 18) period = "afternoon";
    else period = "night";

    const temp = slot.main.temp;
    const rain = slot.pop || 0;

    // lluvia
    if (rain > 0.3) {
      timeline[period].push("🌧️ Lluvia probable");
    }

    // frío
    if (temp < 8) {
      timeline[period].push("❄️ Temperatura baja");
    }

    // calor bueno
    if (temp > 18) {
      timeline[period].push("☀️ Buen clima");
    }
  });

  return timeline;
};

export const generateTimeDecisions = (timeline) => {
  let decisions = [];

  // MAÑANA
  if (timeline.morning.includes("☀️ Buen clima")) {
    decisions.push({
      time: "mañana",
      action: "REGAR",
      message: "🌅 Riega — buen clima"
    });
  }

  if (timeline.morning.includes("🌧️ Lluvia probable")) {
    decisions.push({
      time: "mañana",
      action: "NO_REGAR",
      message: "🌧️ Evita regar — posible lluvia"
    });
  }

  // TARDE
  if (timeline.afternoon.includes("☀️ Buen clima")) {
    decisions.push({
      time: "tarde",
      action: "SACAR",
      message: "☀️ Sácalo"
    });
  }

  // NOCHE
  if (timeline.night.includes("❄️ Temperatura baja")) {
    decisions.push({
      time: "noche",
      action: "PROTEGER",
      message: "❄️ Protégelo en la noche"
    });
  }

  return decisions;
};