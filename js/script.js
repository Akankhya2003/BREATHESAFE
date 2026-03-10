// ================= IMPORT MODULES =================
import { checkAQIAlert } from "./alert.js";
import { showCityHeatmap } from "./heatmap.js";

// ================= API KEY =================
const API_KEY = "b56cc5bf1f5422c72145e1cf71dc1eac";

// ================= MAP VARIABLES =================
let map, marker = null;
let chart;

// ================= INTRO CONTROLLER =================
window.addEventListener("load", () => {
  setTimeout(() => {
    document.getElementById("intro").style.display = "none";
    document.getElementById("mainApp").style.display = "block";
    initMap();
  }, 3500);
});

// ================= AQI STATUS =================
function getAQIStatus(aqi) {
  if (aqi <= 50) return "Good 😊";
  if (aqi <= 100) return "Moderate 😐";
  if (aqi <= 150) return "Unhealthy 😷";
  if (aqi <= 200) return "Very Unhealthy 🤒";
  return "Hazardous ☠️";
}

// ================= INIT MAP =================
function initMap() {

  map = L.map("map").setView([22.9734, 78.6569], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);

  setTimeout(() => map.invalidateSize(), 300);

  map.on("click", async (e) => {

    const { lat, lng } = e.latlng;

    try {

      const geoRes = await fetch(
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lng}&limit=1&appid=${API_KEY}`
      );

      const geoData = await geoRes.json();
      const city = geoData[0]?.name || "Unknown";

      loadAQI(lat, lng, city);

    } catch {

      loadAQI(lat, lng, "Unknown");

    }

  });

}

// ================= LOAD AQI =================
async function loadAQI(lat, lon, cityName = "Unknown") {

  try {

    const aqiRes = await fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
    );

    const aqiData = await aqiRes.json();
    const aqi = aqiData.list[0].main.aqi * 50;

    document.getElementById("city-name").innerText = cityName;
    document.getElementById("aqi-value").innerText = aqi;
    document.getElementById("aqi-status").innerText = getAQIStatus(aqi);

    checkAQIAlert(cityName, aqi);

    highlightLegend(aqi);

    map.flyTo([lat, lon], 12);

    if (marker) map.removeLayer(marker);

    marker = L.marker([lat, lon]).addTo(map)
      .bindPopup(`<b>${cityName}</b><br>AQI: ${aqi}`)
      .openPopup();

    showCityHeatmap(map, lat, lon, aqi);

    saveHistory(cityName, aqi);
    analyzeTrend();
    generateDailyReport(cityName, aqi);
    loadWeather(lat, lon);
    updateChart();

  } catch (err) {

    console.error("AQI fetch error:", err);
    alert("Failed to load AQI data.");

  }

}

// ================= WEATHER =================
async function loadWeather(lat, lon) {

  try {

    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );

    const data = await res.json();

    document.getElementById("weatherTemp").innerText =
      data.main.temp + " °C";

    document.getElementById("weatherWind").innerText =
      data.wind.speed + " m/s";

  } catch {

    console.log("Weather fetch failed");

  }

}

// ================= SAVE HISTORY =================
function saveHistory(city, aqi) {

  let history = JSON.parse(localStorage.getItem("aqiHistory")) || [];

  history.push({
    city: city,
    aqi: aqi,
    time: new Date().toLocaleString()
  });

  if (history.length > 20) history.shift();

  localStorage.setItem("aqiHistory", JSON.stringify(history));

}

// ================= TREND ANALYSIS =================
function analyzeTrend() {

  let history = JSON.parse(localStorage.getItem("aqiHistory")) || [];

  if (history.length < 2) return;

  let last = history[history.length - 1].aqi;
  let prev = history[history.length - 2].aqi;

  let trend = "Stable";

  if (last > prev) trend = "Pollution Increasing ↑";
  if (last < prev) trend = "Air Improving ↓";

  document.getElementById("aqi-trend").innerText = trend;

}

// ================= DAILY REPORT =================
function generateDailyReport(city, aqi) {

  document.getElementById("dailyReport").innerHTML = `
  City : ${city}<br>
  AQI : ${aqi}<br>
  Status : ${getAQIStatus(aqi)}<br>
  Date : ${new Date().toDateString()}
  `;

}

// ================= AQI CHART =================
function updateChart() {

  let history = JSON.parse(localStorage.getItem("aqiHistory")) || [];

  let labels = history.map(h => h.time);
  let values = history.map(h => h.aqi);

  const ctx = document.getElementById("aqiChart");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "AQI Trend",
        data: values
      }]
    }
  });

}

// ================= CURRENT LOCATION =================
document.getElementById("locBtn").addEventListener("click", () => {

  navigator.geolocation.getCurrentPosition(pos => {

    loadAQI(
      pos.coords.latitude,
      pos.coords.longitude,
      "My Location"
    );

  });

});

// ================= SEARCH CITY =================
document.getElementById("searchBtn").addEventListener("click", searchCity);

document.getElementById("cityInput").addEventListener("keypress", e => {
  if (e.key === "Enter") searchCity();
});

async function searchCity() {

  const city = document.getElementById("cityInput").value.trim();
  if (!city) return alert("Enter city name");

  const res = await fetch(
    `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`
  );

  const data = await res.json();

  if (!data.length) return alert("City not found");

  loadAQI(data[0].lat, data[0].lon, data[0].name);

}

// ================= LEGEND =================
function highlightLegend(aqi) {

  const levels = ["good","moderate","unhealthy","very-unhealthy","hazardous"];

  levels.forEach(level => {
    const el = document.querySelector(`.legend-color.${level}`);
    el.style.border = "1px solid #ccc";
    el.style.boxShadow = "none";
  });

  let active = "hazardous";

  if (aqi <= 50) active = "good";
  else if (aqi <= 100) active = "moderate";
  else if (aqi <= 150) active = "unhealthy";
  else if (aqi <= 200) active = "very-unhealthy";

  const el = document.querySelector(`.legend-color.${active}`);

  el.style.border = "3px solid black";
  el.style.boxShadow = "0 0 12px rgba(0,0,0,0.6)";

}

// ================= AUTO REFRESH =================
setInterval(() => {

  if (!marker) return;

  const lat = marker.getLatLng().lat;
  const lon = marker.getLatLng().lng;

  loadAQI(lat, lon, document.getElementById("city-name").innerText);

}, 300000);

// ================= SIDEBAR MENU =================

const sideMenu = document.getElementById("sideMenu");

document.getElementById("menuBtn").onclick = () => {
  sideMenu.style.left = "0";
};

document.getElementById("closeMenu").onclick = () => {
  sideMenu.style.left = "-280px";
};

// ================= HISTORY PANEL =================
document.getElementById("menuHistory").onclick = () => {

  const container = document.getElementById("historyContainer");
  let history = JSON.parse(localStorage.getItem("aqiHistory")) || [];

  container.innerHTML = "<h3>AQI Search History</h3>";

  history.reverse().forEach(h => {

    container.innerHTML += `
    <div class="history-item">
      <b>${h.city}</b><br>
      AQI : ${h.aqi}<br>
      <small>${h.time}</small>
    </div>
    `;

  });

  container.scrollIntoView({behavior:"smooth"});
  sideMenu.style.left = "-280px";

};

// ================= CAPITAL AQI =================
document.getElementById("menuCapitals").onclick = loadCapitalAQI;

async function loadCapitalAQI() {

  const capitals = [
    "Delhi","Mumbai","Kolkata","Chennai","Bangalore",
    "Hyderabad","Bhopal","Lucknow","Patna","Jaipur",
    "Bhubaneswar","Guwahati","Chandigarh"
  ];

  const container = document.getElementById("capitalAQI");
  container.innerHTML = "<h3>Indian Capital AQI</h3>";

  for (let city of capitals) {

    try {

      const geo = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`
      );

      const g = await geo.json();

      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${g[0].lat}&lon=${g[0].lon}&appid=${API_KEY}`
      );

      const data = await res.json();

      const aqi = data.list[0].main.aqi * 50;

      container.innerHTML += `<div>${city} : AQI ${aqi}</div>`;

    } catch {}

  }

  container.scrollIntoView({behavior:"smooth"});
  sideMenu.style.left = "-280px";

}

// ================= MENU SCROLL =================
document.getElementById("menuCharts").onclick = () => {

  document.querySelector(".chart-container")
  .scrollIntoView({behavior:"smooth"});

  sideMenu.style.left = "-280px";

};

document.getElementById("menuReport").onclick = () => {

  document.querySelector(".report-container")
  .scrollIntoView({behavior:"smooth"});

  sideMenu.style.left = "-280px";

};