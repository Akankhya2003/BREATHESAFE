const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());

// ================= AQI =================
app.get("/api/aqi", async (req, res) => {
const { lat, lon } = req.query;

if (!lat || !lon) {
return res.status(400).json({ status: "error", message: "Missing lat/lon", data: null });
}

try {
const response = await axios.get(
`https://api.airvisual.com/v2/nearest_city?lat=${lat}&lon=${lon}&key=${process.env.IQAIR_API_KEY}`
);

const data = response.data;

if (data.status === "fail") {
  return res.json({
    status: "error",
    message: data.data?.message || "API returned fail",
    data: null
  });
}

res.json({ status: "success", data: data.data });


} catch (error) {
console.log("AQI SERVER ERROR:", error.response?.data || error.message);


res.json({
  status: "error",
  message: "API limit or server issue",
  data: null
});


}
});

// ================= POLLUTANTS =================
// ================= POLLUTANTS (OPEN-METEO) =================
app.get("/api/pollutants", async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ status: "error", message: "Missing lat/lon", data: null });
  }

  try {
    const response = await axios.get(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi&timezone=auto`
    );

    res.json({
      status: "success",
      data: response.data
    });

  } catch (error) {
    console.log("POLLUTANT ERROR:", error.message);

    res.json({
      status: "error",
      message: "Failed to fetch pollutant data",
      data: null
    });
  }
});

// ================= WEATHER =================
app.get("/api/weather", async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({
      status: "error",
      message: "Missing lat/lon",
      data: null
    });
  }

  try {
    console.log("Weather request:", lat, lon);

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,windspeed_10m&timezone=auto`;

    const response = await axios.get(url, {
      timeout: 10000,
      headers: { "User-Agent": "BreatheSafe-App" }
    });

    const data = response.data;

    let temperature = data?.current_weather?.temperature;
    let windspeed = data?.current_weather?.windspeed;

    if (temperature == null || windspeed == null) {
      temperature = data?.hourly?.temperature_2m?.[0];
      windspeed = data?.hourly?.windspeed_10m?.[0];
    }

    if (temperature == null || windspeed == null) {
      return res.json({
        status: "error",
        message: "Weather data unavailable",
        data: null
      });
    }

    res.json({
      status: "success",
      data: {
        temperature: Number(temperature),
        windspeed: Number(windspeed)
      }
    });

  } catch (error) {
    console.log("WEATHER ERROR:", error.message);

    // fallback dummy weather so UI never breaks
    res.json({
      status: "success",
      data: {
        temperature: 25,
        windspeed: 5
      }
    });
  }
});

// ================= GEOCODE =================
app.get("/api/geocode", async (req, res) => {
const { city } = req.query;

if (!city) {
return res.status(400).json({ status: "error", message: "Missing city name", data: null });
}

try {
const response = await axios.get(
`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${process.env.OPENWEATHER_API_KEY}`
);


res.json({ status: "success", data: response.data });

} catch (error) {
console.log("GEOCODE ERROR:", error.message);
res.json({ status: "error", message: "Geocoding failed", data: null });
}
});

// ================= REVERSE GEOCODE =================
app.get("/api/reverse", async (req, res) => {
const { lat, lon } = req.query;

if (!lat || !lon) {
return res.status(400).json({ status: "error", message: "Missing lat/lon", data: null });
}

try {
const response = await axios.get(
`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${process.env.OPENWEATHER_API_KEY}`
);

const place = response.data[0];

res.json({
  status: "success",
  data: {
    name: place.name,
    lat: place.lat,
    lon: place.lon
  }
});

} catch (error) {
console.log("REVERSE GEOCODE ERROR:", error.message);
res.json({ status: "error", message: "Reverse geocoding failed", data: null });
}
});

// ================= AQI CHART =================
app.get("/api/aqi-chart", async (req, res) => {
const { lat, lon } = req.query;

if (!lat || !lon) {
return res.status(400).json({ status: "error", message: "Missing lat/lon", data: null });
}

try {
const response = await axios.get(
`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=us_aqi&timezone=auto`
);

res.json({ status: "success", data: response.data });


} catch (error) {
console.log("AQI CHART ERROR:", error.message);
res.json({ status: "error", message: "AQI chart data failed", data: null });
}
});

// ================= ROOT =================
app.get("/", (req, res) => {
res.send("Backend is running ✅");
});

// ================= START SERVER =================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
console.log(`Server running on port ${PORT}`);
});
