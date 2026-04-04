const BASE_URL = "https://breathesafe-3g5q.onrender.com"; 

// ================= IMPORT MODULES =================
import { checkAQIAlert } from "./alert.js";
import { showCityHeatmap } from "./heatmap.js";

// ================= MAP VARIABLES =================
let map, marker = null;

// ================= AUTO REFRESH =================
let autoRefreshInterval = null;

function startAutoRefresh() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);

  autoRefreshInterval = setInterval(() => {
    const lat = localStorage.getItem("cityLat");
    const lon = localStorage.getItem("cityLon");
    const city = localStorage.getItem("cityName");

    if (lat && lon) {
      console.log("Auto refreshing AQI...");
      loadAQI(lat, lon, city);
    }
  }, 300000); // 5 minutes
}

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

  // ================= SIDEBAR =================
  document.getElementById("menuBtn").onclick = () => {
    sideMenu.classList.add("open");
  };

  document.getElementById("closeMenu").onclick = () => {
    sideMenu.classList.remove("open");
  };

  // Sidebar navigation
  document.getElementById("menuHistory").onclick = () => {
    showTab("historyTab");
    sideMenu.classList.remove("open");
  };

  document.getElementById("menuCapitals").onclick = () => {
    showTab("capitalTab");
    loadCapitalAQI();
    sideMenu.classList.remove("open");
  };

  document.getElementById("menuReport").onclick = () => {
    showTab("reportTab");
    generateDailyReport();
    sideMenu.classList.remove("open");
  };

  document.getElementById("menuGuide").onclick = () => {
    showTab("guideTab");
    sideMenu.classList.remove("open");
  };

  // ================= SEARCH =================
  document.getElementById("searchBtn").onclick = searchCity;

  document.getElementById("cityInput").addEventListener("keypress", e => {
    if (e.key === "Enter") searchCity();
  });

  // ================= LOCATION =================
  document.getElementById("locBtn").onclick = useMyLocation;

  // ================= HISTORY =================
  renderHistory();

  // ================= TABS =================
  document.querySelectorAll(".tabBtn").forEach(btn => {
    btn.onclick = () => {

      // active button highlight
      document.querySelectorAll(".tabBtn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const tabId = btn.getAttribute("data-tab");
      showTab(tabId);

      // load content when tab opens
      if (tabId === "capitalTab") loadCapitalAQI();
      if (tabId === "reportTab") generateDailyReport();

      // fix map display when returning to map tab
      if (tabId === "mapTab") {
        setTimeout(() => map.invalidateSize(), 300);
      }
    };
  });
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
    const geoRes = await fetch(`${BASE_URL}/api/reverse?lat=${lat}&lon=${lng}`);
    const result = await geoRes.json();

    if (result.status !== "success" || !result.data) {
      alert("City not found");
      return;
    }

    const city = result.data.name;
    loadAQI(lat, lng, city);

  } catch (err) {
    alert("Failed to detect city name");
    console.error(err);
  }
}

// ================= LOAD AQI =================
async function loadAQI(lat, lon, cityName) {
  try {
    const response = await fetch(`${BASE_URL}/api/aqi?lat=${lat}&lon=${lon}`);
    const aqiData = await response.json();

    console.log("AQI API Response:", aqiData);

    // Check if data exists
    if (!aqiData.data || !aqiData.data.current) {
      alert("AQI data not available for this location.");
      return;
    }

    const aqi = aqiData.data.current.pollution.aqius;
    const pollution = aqiData.data.current.pollution;

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
      <div style="text-align:center;">
        <h3>${cityName}</h3>
        <b>AQI ${aqi}</b><br><br>
        <button onclick="openCityPage()">📊 Open City Dashboard</button>
      </div>
    `).openPopup();

    showCityHeatmap(map, lat, lon, aqi);
    saveHistory(cityName, aqi);
    renderHistory();
    loadWeather(lat, lon);
    startAutoRefresh();

  } catch (err) {
    console.error("AQI fetch error:", err);
    alert("Failed to load AQI data.");
  }
}

// ================= WEATHER =================
async function loadWeather(lat, lon) {
  try {
    const res = await fetch(`${BASE_URL}/api/weather?lat=${lat}&lon=${lon}`);
    const data = await res.json();

    document.getElementById("weatherTemp").innerText =
      data.current_weather.temperature + " °C";

    document.getElementById("weatherWind").innerText =
      data.current_weather.windspeed + " km/h";

  } catch (err) {
    console.error("Weather fetch error:", err);
  }
}

// ================= SEARCH =================
async function searchCity() {
  const city = document.getElementById("cityInput").value.trim();
  if (!city) return;

  try {
    const res = await fetch(`${BASE_URL}/api/geocode?city=${encodeURIComponent(city)}`);
    const result = await res.json();

    if (result.status !== "success" || !result.data) {
      return alert("City not found");
    }

    loadAQI(result.data.lat, result.data.lon, result.data.name);

  } catch (err) {
    console.error(err);
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

// ================= CAPITAL AQI =================
async function loadCapitalAQI() {

  const cities = [
    { name: "Delhi", lat: 28.6139, lon: 77.2090 },
    { name: "Mumbai", lat: 19.0760, lon: 72.8777 },
    { name: "Bangalore", lat: 12.9716, lon: 77.5946 },
    { name: "Bhubaneswar", lat: 20.2961, lon: 85.8245 },
    { name: "Gurugram", lat: 28.4595, lon: 77.0266 },
    { name: "Chandigarh", lat: 30.7333, lon: 76.7794 },
    { name: "Chennai", lat: 13.0827, lon: 80.2707 },
    { name: "Kolkata", lat: 22.5726, lon: 88.3639 },
    { name: "Pune", lat: 18.5204, lon: 73.8567 },
    { name: "Ahmedabad", lat: 23.0225, lon: 72.5714 }
  ];

  const container = document.getElementById("capitalAQI");
  
  let html = "";

  for (let city of cities) {
    try {
      const res = await fetch(`${BASE_URL}/api/aqi?lat=${city.lat}&lon=${city.lon}`);

      if (!res.ok) throw new Error("API Error");

      const data = await res.json();

      let aqi = data?.data?.current?.pollution?.aqius ?? "Not Available";

      html += `
        <div class="history-item">
          ${city.name} - AQI ${aqi}
        </div>
      `;

    } catch (err) {
      console.error(`Error for ${city.name}:`, err);
      html += `
        <div class="history-item">
          ${city.name} - AQI Not Available
        </div>
      `;
    }

    // ✅ small delay to avoid rate limit
    await new Promise(res => setTimeout(res, 1000));
  }

  container.innerHTML = html;
}

// ================= DAILY REPORT =================
function generateDailyReport() {
  let history = JSON.parse(localStorage.getItem("aqiChartData")) || [];
  const reportBox = document.getElementById("dailyReport");

  if (history.length === 0) {
    reportBox.innerHTML = "No data available.";
    return;
  }

  let minAQI = Math.min(...history.map(h => h.aqi));
  let maxAQI = Math.max(...history.map(h => h.aqi));
  let avgAQI = Math.round(
    history.reduce((sum, h) => sum + h.aqi, 0) / history.length
  );

  reportBox.innerHTML = `
    <p><b>Minimum AQI:</b> ${minAQI}</p>
    <p><b>Maximum AQI:</b> ${maxAQI}</p>
    <p><b>Average AQI:</b> ${avgAQI}</p>
    <p><b>Total Records:</b> ${history.length}</p>
  `;
}

// ================= HISTORY =================
function saveAQIHistory(aqi) {
  let history = JSON.parse(localStorage.getItem("aqiChartData")) || [];

  const now = new Date();
  const timeLabel = now.getHours() + ":" + now.getMinutes();

  history.push({ aqi: aqi, time: timeLabel });

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

// ================= LEGEND =================
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

// ================= OPEN SECTIONS =================
function openSection(sectionClass) {
  document.querySelector(".map-wrapper").style.display = "none";

  document.querySelectorAll(".section").forEach(sec => {
    sec.classList.remove("active");
    sec.style.display = "none";
  });

  const section = document.querySelector("." + sectionClass);
  if (section) {
    section.style.display = "block";
    setTimeout(() => section.classList.add("active"), 50);
  }

  document.getElementById("sideMenu").classList.remove("open");
}

// ================= CITY PAGE =================
window.openCityPage = function () {
  window.location.href = "city.html";
};

function showTab(tabId) {
  document.querySelectorAll(".tab-content").forEach(tab => {
    tab.classList.remove("active");
  });

  document.getElementById(tabId).classList.add("active");
}