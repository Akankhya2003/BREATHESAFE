const DEMO_MODE = true; // change to true during presentation if API fails
const BASE_URL = "https://breathesafe-3g5q.onrender.com"; 

// ================= MAP VARIABLES =================
let map, marker = null;
let autoRefreshInterval = null;

//======= SHARED API===============
const liveAQIStore = new Map();

async function getAQI(lat, lon) {
  const nLat = normalizeCoord(lat);
  const nLon = normalizeCoord(lon);
  const key = `${nLat},${nLon}`;

  try {
    const res = await fetch(`${BASE_URL}/api/aqi?lat=${nLat}&lon=${nLon}`);

    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }

    const data = await res.json();

    console.log("AQI API Response:", data);

    if (
      data?.status === "success" &&
      data?.data?.current?.pollution?.aqius != null
    ) {
      const aqi = data.data.current.pollution.aqius;

      // SAVE latest AQI in shared cache
      liveAQIStore.set(key, {
        value: aqi,
        time: Date.now()
      });

      return aqi;
    }

    throw new Error("Invalid AQI data");

  } catch (err) {
    console.error("AQI Fetch Failed:", err);

    // fallback cached AQI if available
    return liveAQIStore.get(key)?.value ?? 100;
  }
}

//======= GET CACHED AQI ===========
function getLatestAQI(lat, lon) {
  const key = `${normalizeCoord(lat)},${normalizeCoord(lon)}`;

  return liveAQIStore.get(key)?.value ?? null;
}

//====== GLOBAL NORMALIZATION FUNCTION ========
function normalizeCoord(num) {
  return Number(Number(num).toFixed(4));
}

// ================= AUTO REFRESH =================
function startAutoRefresh() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);

  autoRefreshInterval = setInterval(() => {
    const lat = parseFloat(localStorage.getItem("cityLat"));
    const lon = parseFloat(localStorage.getItem("cityLon"));
    const city = localStorage.getItem("cityName");

    if (!isNaN(lat) && !isNaN(lon)) {
      loadAQI(lat, lon, city);
    }
  }, 300000);
}

// ================= APP START =================
window.addEventListener("load", () => {

  const intro = document.getElementById("intro");
  const mainApp = document.getElementById("mainApp");

  // STEP 1: SHOW INTRO FIRST
  intro.style.display = "flex";
  mainApp.style.display = "none";

  // STEP 2: KEEP INTRO FOR 2–3 SECONDS
  setTimeout(() => {

    intro.style.display = "none";
    mainApp.style.display = "block";

    setupUI();

    requestAnimationFrame(() => {
      initMap();
      setTimeout(() => map.invalidateSize(), 300);
    });

  }, 2500); // ⬅️ intro duration

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

  setTimeout(() => map.invalidateSize(), 500);
  setTimeout(() => map.invalidateSize(), 1000);
  setTimeout(() => map.invalidateSize(), 1500);

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

function updateUIWithAQI(aqi, lat, lon, cityName, source = "Live") {

  const safeAQI = Number.isFinite(aqi) ? aqi : 100;
  const safeLat = normalizeCoord(lat);
  const safeLon = normalizeCoord(lon);

  // ================= DOM UPDATE =================
  document.getElementById("city-name").textContent = cityName;
  document.getElementById("aqi-value").textContent = safeAQI;
  document.getElementById("aqi-status").textContent = getAQIStatus(safeAQI);
  document.getElementById("lastUpdated").textContent =
    new Date().toLocaleTimeString();
  document.getElementById("dataSource").textContent = source;

  // ================= LOCAL STORAGE =================
  localStorage.setItem("cityName", cityName);
  localStorage.setItem("cityLat", safeLat);
  localStorage.setItem("cityLon", safeLon);
  localStorage.setItem("cityAQI", safeAQI);

  // ================= MAP UPDATE =================
  if (map && !isNaN(safeLat) && !isNaN(safeLon)) {

    map.flyTo([safeLat, safeLon], 12, { animate: true });

    if (!marker) {
      marker = L.marker([safeLat, safeLon]).addTo(map);
    } else {
      marker.setLatLng([safeLat, safeLon]);
    }

    marker.bindPopup(`
      <div style="text-align:center;">
        <h3>${cityName}</h3>
        <b>AQI ${safeAQI}</b><br><br>
        <button onclick="openCityDashboard('${cityName}', ${safeLat}, ${safeLon})">
          📊 Open Dashboard
        </button>
      </div>
    `).openPopup();

    showCityAQI(map, safeLat, safeLon, safeAQI);
  }

  // ================= UI EFFECTS =================
  highlightLegend(safeAQI);
  saveHistory(cityName, safeAQI);
  renderHistory();
  checkAQIAlert(cityName, safeAQI);

  // ================= REFRESH CAPITAL TAB =================
  const capitalTab = document.getElementById("capitalTab");

  if (capitalTab?.classList.contains("active")) {
    clearTimeout(window.capitalRefreshTimer);

    window.capitalRefreshTimer = setTimeout(() => {
      loadCapitalAQI(false);
    }, 500);
  }
}


// ================= LOAD AQI =================
async function loadAQI(lat, lon, cityName) {

  try {
    lat = normalizeCoord(lat);
    lon = normalizeCoord(lon);

    if (isNaN(lat) || isNaN(lon)) {
      console.error("Invalid coordinates:", lat, lon);
      return;
    }

    // ================= DEMO MODE =================
    if (DEMO_MODE) {
      const demoAQI = Math.floor(Math.random() * 200) + 50;

      updateUIWithAQI(
        demoAQI,
        lat,
        lon,
        cityName,
        "Demo Mode"
      );

      return;
    }

    // ================= GET AQI =================
    let aqi = getLatestAQI(lat, lon);

    if (aqi === null) {
      aqi = await getAQI(lat, lon);
    }

    if (!Number.isFinite(aqi)) {
      aqi = 100;
    }

    // ================= UPDATE =================
    updateUIWithAQI(
      aqi,
      lat,
      lon,
      cityName,
      "Live API"
    );

    // ================= LOAD WEATHER =================
    await loadWeather(lat, lon);

    // ================= AUTO REFRESH =================
    if (!autoRefreshInterval) {
      startAutoRefresh();
    }

  } catch (err) {

    console.error("AQI Fetch Error:", err);

    updateUIWithAQI(
      100,
      lat,
      lon,
      cityName,
      "Fallback Mode"
    );
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
async function loadCapitalAQI(forceRefresh = false) {

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

  if (!container) return;

  let html = "";

  for (const city of cities) {

    try {

      let aqi;

      // ================= CACHE / REFRESH =================
      if (forceRefresh) {
        aqi = await getAQI(city.lat, city.lon);

      } else {
        aqi = getLatestAQI(city.lat, city.lon);

        if (aqi === null) {
          aqi = await getAQI(city.lat, city.lon);
        }
      }

      const safeAQI = Number.isFinite(aqi) ? aqi : 100;

      const color = getAQIColor(safeAQI);
      const status = getAQIStatus(safeAQI);

      html += `
        <div class="capital-card">
          <div class="capital-left">
            <div class="capital-name">${city.name}</div>
            <div class="capital-status">${status}</div>
          </div>

          <div class="capital-right">
            <div class="capital-aqi" style="color:${color}">
              ${safeAQI}
            </div>
          </div>
        </div>
      `;

      // delay avoids API spam
      await new Promise(r => setTimeout(r, 200));

    } catch (err) {

      console.error(`Error loading AQI for ${city.name}:`, err);

      html += `
        <div class="capital-card error-card">
          <div class="capital-left">
            <div class="capital-name">${city.name}</div>
            <div class="capital-status">Data not available</div>
          </div>

          <div class="capital-right">
            <div class="capital-aqi">--</div>
          </div>
        </div>
      `;
    }
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

  container.innerHTML = history.reverse().map(h => {
    let color = getAQIColor(h.aqi);
    let status = getAQIStatus(h.aqi);

    return `
      <div class="history-card">
        <div class="history-left">
          <div class="history-city">${h.city}</div>
          <div class="history-time">${h.time}</div>
        </div>

        <div class="history-right">
          <div class="history-aqi" style="color:${color}">
            ${h.aqi}
          </div>
          <div class="history-status">
            ${status}
          </div>
        </div>
      </div>
    `;
  }).join("");
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
window.openCityDashboard = function(city, lat, lon) {
  localStorage.setItem("cityName", city);
  localStorage.setItem("cityLat", lat);
  localStorage.setItem("cityLon", lon);

  window.location.href = "city.html";
};

function showTab(tabId) {

  document.querySelectorAll(".tab-content").forEach(tab => {
    tab.classList.remove("active");
    tab.style.display = "none";
  });

  const activeTab = document.getElementById(tabId);

  activeTab.style.display = "block";
  activeTab.classList.add("active");

  requestAnimationFrame(() => {
    if (map) map.invalidateSize();
  });
}

// ================= ALERT FUNCTIONS =================
function checkAQIAlert(city, aqi) {

  const alertBox = document.getElementById("aqiAlert");
  const title = document.getElementById("aqiAlertTitle");
  const msg = document.getElementById("aqiAlertMessage");
  const closeBtn = document.getElementById("aqiAlertClose");
  const box = alertBox.querySelector(".aqi-alert-box");

  if (!alertBox) return;

  // RESET FIRST (IMPORTANT FIX)
  alertBox.classList.remove("hidden");

  // If safe → hide alert
  if (aqi <= 100) {
    alertBox.classList.add("hidden");
    return;
  }

  // reset styles
  box.className = "aqi-alert-box";

  let level = "";
  let advice = "";
  let icon = "";

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

  title.innerText = `${icon} AQI Alert - ${level}`;
  msg.innerHTML =
    `<b>City:</b> ${city}<br>
     <b>AQI:</b> ${aqi}<br>
     <b>Health Advice:</b> ${advice}`;

  alertBox.classList.remove("hidden");

  setTimeout(() => {
    alertBox.classList.add("hidden");
  }, 10000);

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
  if (!map || lat == null || lon == null || aqi == null) return;
  
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