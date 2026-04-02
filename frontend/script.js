// ================= IMPORT MODULES =================
import { checkAQIAlert } from "./alert.js";
import { showCityHeatmap } from "./heatmap.js";

// ================= MAP VARIABLES =================
let map, marker = null;

// ================= APP START =================
window.addEventListener("load", () => {
  setTimeout(() => {
    document.getElementById("intro").style.display = "none";
    document.getElementById("mainApp").style.display = "block";

    initMap();
    setupUI();

    setTimeout(() => map.invalidateSize(), 500);
  }, 3000);
});

// ================= AQI STATUS =================
function getAQIStatus(aqi) {
  if (aqi <= 50) return "Good 😊";
  if (aqi <= 100) return "Moderate 😐";
  if (aqi <= 150) return "Unhealthy 😷";
  if (aqi <= 200) return "Very Unhealthy 🤒";
  return "Hazardous ☠️";
}

// ================= SETUP UI =================
function setupUI() {
  const sideMenu = document.getElementById("sideMenu");

  document.getElementById("menuBtn").onclick = () => sideMenu.classList.add("open");
  document.getElementById("closeMenu").onclick = () => sideMenu.classList.remove("open");

  document.getElementById("searchBtn").onclick = searchCity;

  document.getElementById("cityInput").addEventListener("keypress", e => {
    if (e.key === "Enter") searchCity();
  });

  document.getElementById("locBtn").onclick = useMyLocation;

  renderHistory();
}

// ================= INIT MAP =================
function initMap() {
  map = L.map("map").setView([22.9734, 78.6569], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  map.on("click", handleMapClick);
}

// ================= MAP CLICK =================
async function handleMapClick(e) {
  const { lat, lng } = e.latlng;

  try {
    const geoRes = await fetch(
      `http://localhost:5000/api/reverse?lat=${lat}&lon=${lng}`
    );

    const geoData = await geoRes.json();

    if (!Array.isArray(geoData) || geoData.length === 0) {
      alert("City not found");
      return;
    }

    const city = geoData[0].name;
    loadAQI(lat, lng, city);

  } catch (err) {
    alert("Failed to detect city name");
    console.error(err);
  }
}

// ================= LOAD AQI =================
async function loadAQI(lat, lon, cityName = "Unknown") {
  try {
    document.getElementById("aqi-value").innerText = "Loading...";

    const res = await fetch(
      `http://localhost:5000/api/aqi?lat=${lat}&lon=${lon}`
    );

    const data = await res.json();
    const pollution = data.data.current.pollution;
    const aqi = pollution.aqius;

    const components = {
      pm2_5: pollution.pm25 || 0,
      pm10: pollution.pm10 || 0,
      no2: pollution.no2 || 0,
      so2: pollution.so2 || 0,
      o3: pollution.o3 || 0,
      co: pollution.co || 0
    };

    // SAVE DATA
    localStorage.setItem("cityName", cityName);
    localStorage.setItem("cityLat", lat);
    localStorage.setItem("cityLon", lon);
    localStorage.setItem("cityAQI", aqi);
    localStorage.setItem("cityPM25", components.pm2_5);
    localStorage.setItem("cityPM10", components.pm10);
    localStorage.setItem("cityNO2", components.no2);
    localStorage.setItem("citySO2", components.so2);
    localStorage.setItem("cityO3", components.o3);
    localStorage.setItem("cityCO", components.co);
    localStorage.setItem("aqiTime", new Date().toLocaleString());

    saveAQIHistory(aqi);

    // UPDATE UI
    document.getElementById("city-name").innerText = cityName;
    document.getElementById("aqi-value").innerText = aqi;
    document.getElementById("aqi-status").innerText = getAQIStatus(aqi);
    document.getElementById("lastUpdated").innerText = new Date().toLocaleTimeString();

    checkAQIAlert(cityName, aqi);
    highlightLegend(aqi);

    map.flyTo([lat, lon], 12);

    if (marker) map.removeLayer(marker);

    marker = L.marker([lat, lon]).addTo(map).bindPopup(`
      <div style="text-align:center;font-family:Arial;">
        <h3>${cityName}</h3>
        <div style="font-size:22px;font-weight:bold;color:#1e88e5;">
          AQI: ${aqi}
        </div>
        <br>
        <button onclick="openCityPage()"
          style="padding:8px 14px;background:linear-gradient(135deg,#1e88e5,#43a047);
          color:white;border:none;border-radius:6px;cursor:pointer;">
          📊 Open City Dashboard
        </button>
      </div>
    `).openPopup();

    showCityHeatmap(map, lat, lon, aqi);
    saveHistory(cityName, aqi);
    renderHistory();
    loadWeather(lat, lon);

  } catch (err) {
    console.error("AQI fetch error:", err);
    alert("Failed to load AQI data.");
  }
}

// ================= WEATHER =================
async function loadWeather(lat, lon) {
  try {
    const res = await fetch(
      `http://localhost:5000/api/weather?lat=${lat}&lon=${lon}`
    );

    const data = await res.json();

    const temp = data.current_weather.temperature;
    const wind = data.current_weather.windspeed;
    const humidity = data.hourly.relativehumidity_2m[0];

    localStorage.setItem("cityTemp", temp);
    localStorage.setItem("cityWind", wind);
    localStorage.setItem("cityHumidity", humidity);

    document.getElementById("weatherTemp").innerText = temp + " °C";
    document.getElementById("weatherWind").innerText = wind + " km/h";

  } catch (err) {
    console.error("Weather fetch error:", err);
  }
}

// ================= SEARCH =================
async function searchCity() {
  const city = document.getElementById("cityInput").value.trim();
  if (!city) return;

  try {
    const res = await fetch(
  `http://localhost:5000/api/geocode?city=${encodeURIComponent(city)}`
);
    const data = await res.json();
    if (!data.length) return alert("City not found");

    loadAQI(data[0].lat, data[0].lon, data[0].name);

  } catch {
    alert("Search failed");
  }
}

// ================= LOCATION =================
function useMyLocation() {
  if (!navigator.geolocation) return alert("Geolocation not supported");

  navigator.geolocation.getCurrentPosition(pos => {
    loadAQI(pos.coords.latitude, pos.coords.longitude, "My Location");
  });
}

// ================= REST SAME =================
window.openCityPage = function () {
  window.location.href = "city.html";
};

function saveAQIHistory(aqi) {
  let history = JSON.parse(localStorage.getItem("aqiChartData")) || [];

  history.push({
    aqi: aqi,
    time: new Date().getHours() + ":00"
  });

  if (history.length > 24) history.shift();

  localStorage.setItem("aqiChartData", JSON.stringify(history));
}

function saveHistory(city, aqi) {
  let history = JSON.parse(localStorage.getItem("aqiHistory")) || [];

  history.push({ city, aqi, time: new Date().toLocaleTimeString() });

  if (history.length > 5) history = history.slice(-5);

  localStorage.setItem("aqiHistory", JSON.stringify(history));
}

function renderHistory() {
  const container = document.getElementById("historyContainer");
  if (!container) return;

  let history = JSON.parse(localStorage.getItem("aqiHistory")) || [];

  container.innerHTML = history.map(h => `
    <div class="history-item">
      ${h.city} - AQI ${h.aqi}<br>
      <small>${h.time}</small>
    </div>
  `).join("");
}

function highlightLegend(aqi) {
  const levels = ["good","moderate","unhealthy","very-unhealthy","hazardous"];

  levels.forEach(l => {
    const el = document.querySelector(`.${l}`);
    if (el) el.style.border = "none";
  });

  let active = "hazardous";

  if (aqi <= 50) active = "good";
  else if (aqi <= 100) active = "moderate";
  else if (aqi <= 150) active = "unhealthy";
  else if (aqi <= 200) active = "very-unhealthy";

  const el = document.querySelector(`.${active}`);
  if (el) el.style.border = "3px solid black";
}