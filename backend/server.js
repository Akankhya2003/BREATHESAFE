// server.js

const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 5000;

// ================= AQI =================
app.get("/api/aqi", async (req, res) => {
  const { lat, lon } = req.query;

  try {
    const response = await axios.get(
      `https://api.airvisual.com/v2/nearest_city?lat=${lat}&lon=${lon}&key=${process.env.IQAIR_API_KEY}`
    );

    res.json(response.data);

  } catch (error) {
    console.error("AQI API ERROR:");
    console.error(error.response?.data || error.message);

    res.status(500).json({
      error: "Failed to fetch AQI data",
      details: error.response?.data
    });
  }
});

// ================= WEATHER =================
app.get("/api/weather", async (req, res) => {
  const { lat, lon } = req.query;

  try {
    const response = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
    );

    res.json(response.data);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
});

// ================= GEOCODE =================
app.get("/api/geocode", async (req, res) => {
  const { city } = req.query;

  try {
    const response = await axios.get(
      `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${process.env.OPENWEATHER_API_KEY}`
    );

    res.json(response.data);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Geocoding failed" });
  }
});

// ================= REVERSE GEOCODE =================
app.get("/api/reverse", async (req, res) => {
  const { lat, lon } = req.query;

  try {
    const response = await axios.get(
      `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${process.env.OPENWEATHER_API_KEY}`
    );

    res.json(response.data);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Reverse geocoding failed" });
  }
});

// ================= AQI CHART =================
app.get("/api/aqi-chart", async (req, res) => {
  const { lat, lon } = req.query;

  try {
    const response = await axios.get(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=us_aqi&timezone=auto`
    );

    res.json(response.data);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "AQI chart data failed" });
  }
});

// ================= POLLUTANTS =================
app.get("/api/pollutants", async (req, res) => {
  const { lat, lon } = req.query;

  try {
    const response = await axios.get(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&timezone=auto`
    );

    res.json(response.data);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Pollutant data failed" });
  }
});

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});