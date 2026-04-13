const DEMO_MODE = false; // change to true during presentation if API fails
const BASE_URL = "https://breathesafe-3g5q.onrender.com"; 

// ================= MAP VARIABLES =================
let map, marker = null;
let autoRefreshInterval = null;

// ================= AUTO REFRESH =================
function startAutoRefresh() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);

  autoRefreshInterval = setInterval(() => {
    const lat = parseFloat(localStorage.getItem("cityLat"));
    const lon = parseFloat(localStorage.getItem("cityLon"));
    const city = localStorage.getItem("cityName");

    if (!isNaN(lat) && !isNaN(lon)) {
      console.log("Auto refreshing AQI...");
      loadAQI(lat, lon, city);
    }
  }, 300000);
}

// ================= APP START =================
window.addEventListener("load", () => {
  setTimeout(() => {
    document.getElementById("intro").style.display = "none";
    document.getElementById("mainApp").style.display = "block";

    setupUI();

    setTimeout(() => {
      initMap();

      setTimeout(() => {
        map.invalidateSize();
      }, 800);

    }, 300);

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
      // fix map display when returning to map tab
      if (tabId === "mapTab") {
        setTimeout(() => map.invalidateSize(), 300);
      }
    };
  });
}

// ================= INIT MAP =================
function initMap() {
  console.log("Initializing map...");

  map = L.map("map", {
    zoomControl: true
  }).setView([22.9734, 78.6569], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);

  map.on("click", handleMapClick);

  // VERY IMPORTANT for mobile/webview rendering
  setTimeout(() => {
    map.invalidateSize();
  }, 800);

  console.log("Map loaded successfully");
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

function updateUIWithAQI(aqi, pollution, lat, lon, cityName, source = "Live") {
// Update UI
document.getElementById("city-name").innerText = cityName;
document.getElementById("aqi-value").innerText = aqi;
document.getElementById("aqi-status").innerText = getAQIStatus(aqi);
document.getElementById("lastUpdated").innerText = new Date().toLocaleTimeString();
document.getElementById("dataSource").innerText = source;

// Save cache
localStorage.setItem("cityName", cityName);
localStorage.setItem("cityLat", lat);
localStorage.setItem("cityLon", lon);
localStorage.setItem("cityAQI", aqi);

// Move map
if (!isNaN(lat) && !isNaN(lon)) {
map.flyTo([lat, lon], 12);
}

// Marker
if (marker) map.removeLayer(marker);

marker = L.marker([lat, lon]).addTo(map)
  .bindPopup(`
    <div style="text-align:center;">
      <h3>${cityName}</h3>
      <b>AQI ${aqi}</b><br><br>
      <button onclick="openCityPage()">📊 Open Dashboard</button>
    </div>
  `)
  .openPopup();

highlightLegend(aqi);
saveHistory(cityName, aqi);
renderHistory();
checkAQIAlert(cityName, aqi);
showCityAQI(map, lat, lon, aqi);
}


// ================= LOAD AQI =================
async function loadAQI(lat, lon, cityName) {
  try {
    lat = parseFloat(lat);
    lon = parseFloat(lon);

    if (isNaN(lat) || isNaN(lon)) {
      console.error("Invalid coordinates:", lat, lon);
      return;
    }

    // DEMO MODE (for presentation)
    if (DEMO_MODE) {
      console.log("Running in DEMO MODE");

      const demoAQI = Math.floor(Math.random() * 200) + 50;
      const pollution = {};

      updateUIWithAQI(demoAQI, pollution, lat, lon, cityName, "Demo Mode");
      return;
    }

    const response = await fetch(`${BASE_URL}/api/aqi?lat=${lat}&lon=${lon}`);
    const aqiData = await response.json();

    // If API fails → use cached AQI
    if (aqiData.status !== "success" || !aqiData?.data?.current?.pollution) {
      console.warn("API failed, using cached/demo data");

      const cachedAQI = localStorage.getItem("cityAQI");

      if (cachedAQI) {
        updateUIWithAQI(cachedAQI, {}, lat, lon, cityName, "Cached Data");
      } else {
        const demoAQI = 120;
        updateUIWithAQI(demoAQI, {}, lat, lon, cityName, "Demo Mode");
      }

      return;
    }

    // Real AQI data
    const aqi = aqiData.data.current.pollution.aqius;
    const pollution = aqiData.data.current.pollution;

    updateUIWithAQI(aqi, pollution, lat, lon, cityName, "Live API");
    loadWeather(lat, lon);
    startAutoRefresh();

  } catch (err) {
    console.error("AQI fetch error:", err);

    // Fallback demo data
    const demoAQI = 100;
    updateUIWithAQI(demoAQI, {}, lat, lon, cityName, "Demo Mode");
  }
}

// ================= WEATHER =================
async function loadWeather(lat, lon) {
  try {
    console.log("Fetching weather for:", lat, lon);

    const res = await fetch(`${BASE_URL}/api/weather?lat=${lat}&lon=${lon}`);
    const result = await res.json();

    console.log("Weather API FULL:", JSON.stringify(result, null, 2));

    if (
      !result ||
      result.status !== "success" ||
      !result.data ||
      result.data.temperature == null ||
      result.data.windspeed == null
    ) {
      console.warn("Weather data missing or invalid:", result);
      return;
    }

    const tempEl = document.getElementById("heroTemp");
    const windEl = document.getElementById("heroWind");
    const humEl = document.getElementById("heroHumidity");

    if (tempEl) tempEl.innerText = result.data.temperature;
    if (windEl) windEl.innerText = result.data.windspeed;
    if (humEl) humEl.innerText = "--";

  } catch (err) {
    console.error("Weather error:", err);
  }
}

// ================= SEARCH =================
async function searchCity() {
  const city = document.getElementById("cityInput").value.trim();
  if (!city) return;

  try {
    const res = await fetch(`${BASE_URL}/api/geocode?city=${encodeURIComponent(city)}`);
    const result = await res.json();

    console.log("Geocode result:", result);

    if (result.status !== "success" || !result.data || result.data.length === 0) {
      return alert("City not found");
    }

    const cityData = result.data[0];

    const lat = cityData.lat || cityData.latitude;
    const lon = cityData.lon || cityData.longitude;
    const name = cityData.name || city;

    if (!lat || !lon) {
      alert("Coordinates not found");
      console.error(cityData);
      return;
    }

    loadAQI(lat, lon, name);

  } catch (err) {
    console.error(err);
    alert("Search failed");
  }
}

// ================= LOCATION =================
async function useMyLocation() {
  try {
    const isCapacitor = window.Capacitor?.isNativePlatform();

    if (isCapacitor) {
      const { Geolocation } = window.Capacitor.Plugins;
      // ✅ STEP 1: Check permission
      let perm = await Geolocation.checkPermissions();
      console.log("Permission status:", perm);

      // ✅ STEP 2: Request if not granted
      if (perm.location !== "granted") {
        perm = await Geolocation.requestPermissions();

        if (perm.location !== "granted") {
          alert("Location permission denied. Please enable it in settings.");
          return;
        }
      }

      // ✅ STEP 3: Try high accuracy first
      let position;

      try {
        position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0
        });
      } catch (err) {
        console.warn("High accuracy failed, trying low accuracy...");

        // ✅ fallback (very important)
        position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 20000
        });
      }

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      console.log("✅ Mobile location:", lat, lon);

      loadAQI(lat, lon, "My Location");

    } else {
      // 🌐 Browser (your original logic is fine)
      if (!navigator.geolocation) {
        alert("Geolocation not supported");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          loadAQI(
            position.coords.latitude,
            position.coords.longitude,
            "My Location"
          );
        },
        (error) => {
          if (error.code === 1) {
            alert("Permission denied. Please allow location.");
          } else if (error.code === 2) {
            alert("Location unavailable. Turn on GPS.");
          } else {
            alert("Unable to get location");
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000
        }
      );
    }

  } catch (error) {
    console.error("❌ Location error:", error);

    // ✅ Better error messages
    if (error.message?.includes("denied")) {
      alert("Permission denied. Enable it from app settings.");
    } else if (error.message?.includes("timeout")) {
      alert("Location timeout. Go outdoors and try again.");
    } else {
      alert("Unable to get location. Check GPS & permissions.");
    }
  }
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

      let aqi;

if (data?.status === "success") {
  aqi = data?.data?.current?.pollution?.aqius;
} else {
  // fallback demo AQI
  aqi = Math.floor(Math.random() * 150) + 50;
}
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

// ================= ALERT FUNCTIONS =================
function checkAQIAlert(city, aqi) {

  const alertBox = document.getElementById("aqiAlert");
  const title = document.getElementById("aqiAlertTitle");
  const msg = document.getElementById("aqiAlertMessage");
  const closeBtn = document.getElementById("aqiAlertClose");
  const box = alertBox.querySelector(".aqi-alert-box");

  if (!alertBox) return;

  // Hide alert if AQI safe
  if (aqi <= 100) {
    alertBox.classList.add("hidden");
    return;
  }

  // Reset classes
  box.className = "aqi-alert-box";

  let level = "";
  let advice = "";
  let icon = "";

  // ================= ALERT LEVELS =================
  if (aqi <= 150) {
    level = "Unhealthy for Sensitive Groups";
    advice = "Children, elderly and asthma patients should avoid outdoor activities.";
    icon = "⚠️";
    box.classList.add("aqi-unhealthy");
  }
  else if (aqi <= 200) {
    level = "Unhealthy Air Quality";
    advice = "Wear mask and avoid outdoor exercise.";
    icon = "🚨";
    box.classList.add("aqi-very");
  }
  else if (aqi <= 300) {
    level = "Very Unhealthy";
    advice = "Stay indoors and use air purifier.";
    icon = "😷";
    box.classList.add("aqi-danger");
  }
  else {
    level = "Hazardous";
    advice = "Emergency condition. Stay indoors. Schools should close.";
    icon = "☠️";
    box.classList.add("aqi-hazard");
  }

  // ================= SET CONTENT =================
  title.innerText = icon + " AQI Alert - " + level;

  msg.innerHTML =
    `<b>City:</b> ${city}<br>
     <b>AQI:</b> ${aqi}<br>
     <b>Health Advice:</b> ${advice}`;

  // Show alert
  alertBox.classList.remove("hidden");

  // Auto close after 10 seconds
  setTimeout(() => {
    alertBox.classList.add("hidden");
  }, 10000);

  // Close button
  closeBtn.onclick = () => {
    alertBox.classList.add("hidden");
  };

}

//================== HEATMAP FUNCTIONS =================
let aqiCircle = null;

function getAQIColor(aqi) {
  if (aqi <= 50) return "#00e400";
  if (aqi <= 100) return "#ffff00";
  if (aqi <= 150) return "#ff7e00";
  if (aqi <= 200) return "#ff0000";
  if (aqi <= 300) return "#8f3f97";
  return "#7e0023";
}

function showCityAQI(map, lat, lon, aqi) {
  if (!map || !lat || !lon || !aqi) return;

  // Remove old circle
  if (aqiCircle) {
    map.removeLayer(aqiCircle);
  }

  const color = getAQIColor(aqi);

  // Radius scales slightly with AQI (optional)
  const radius = 2000 + (aqi * 10);

  aqiCircle = L.circle([lat, lon], {
    radius: radius,
    fillColor: color,
    fillOpacity: 0.6,
    stroke: false
  }).addTo(map);
}