const BASE_URL = "https://breathesafe-3g5q.onrender.com";

// ================= GET DATA FROM LOCAL STORAGE =================
const city = localStorage.getItem("cityName");
const lat = parseFloat(localStorage.getItem("cityLat"));
const lon = parseFloat(localStorage.getItem("cityLon"));

if (!city || isNaN(lat) || isNaN(lon)) 
  {
    alert("No city selected.");
    window.location.href = "index.html";
  }

// ================= SET HEADER =================
document.getElementById("cityTitle").innerText = "🌍 AQI Dashboard - " + city;
document.getElementById("heroCity").innerText = city;

// ================= LOAD DEFAULT SECTION =================
window.addEventListener("load", () => {
  showSection("chartSection");
});

// ================= LOAD DATA =================
loadAQI();
loadWeather();
loadAQICharts();
loadPollutants();

// ================= AQI COLOR =================
function getAQIColor(aqi){
  if(aqi <= 50) return "#00e400";
  if(aqi <= 100) return "#ffff00";
  if(aqi <= 150) return "#ff7e00";
  if(aqi <= 200) return "#ff0000";
  if(aqi <= 300) return "#8f3f97";
  return "#7e0023";
}

// ================= AQI STATUS =================
function getAQIStatus(aqi){
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy";
  if (aqi <= 200) return "Very Unhealthy";
  return "Hazardous";
}

// ================= LOAD AQI =================
async function loadAQI() {
  try {
    const res = await fetch(`${BASE_URL}/api/aqi?lat=${lat}&lon=${lon}`);
    const data = await res.json();

    if(!data?.data) throw new Error("Invalid AQI data");

    const pollution = data.data.current.pollution;
    const aqi = pollution.aqius;

    document.getElementById("heroAQI").innerText = aqi;
    document.getElementById("heroAQI").style.color = getAQIColor(aqi);
    document.getElementById("heroStatus").innerText = getAQIStatus(aqi);

    setHealthAdvice(aqi);
    moveAQIMarker(aqi);

  } catch (err) {
    console.error("AQI Error:", err);
    document.getElementById("heroStatus").innerText = "Failed to load AQI ❌";
  }
}

// ================= MOVE AQI MARKER =================
function moveAQIMarker(aqi){
  const marker = document.getElementById("aqiMarker");
  if(!marker) return;
  let percent = Math.min((aqi / 300) * 100, 100);
  marker.style.left = percent + "%";
}

// ================= WEATHER =================
async function loadWeather() {
  try {
    const res = await fetch(`${BASE_URL}/api/weather?lat=${lat}&lon=${lon}`);
    const data = await res.json();

    document.getElementById("heroTemp").innerText = data.current_weather.temperature;
    document.getElementById("heroWind").innerText = data.current_weather.windspeed;
    document.getElementById("heroHumidity").innerText = data.hourly.relativehumidity_2m[0];

  } catch (err) {
    console.error("Weather error:", err);
  }
}
// ================= LOAD AQI CHART DATA =================
async function loadAQICharts(){
  try {
    const res = await fetch(`${BASE_URL}/api/aqi-chart?lat=${lat}&lon=${lon}`);
    const data = await res.json();

    if(!data.hourly) throw new Error("No chart data");

    const hourlyAQI = data.hourly.us_aqi;
    const hourlyTime = data.hourly.time;

    const now = new Date();
    let filteredAQI = [];
    let filteredTime = [];

    // ===== FILTER VALID DATA =====
    for(let i = 0; i < hourlyTime.length; i++){
      const t = new Date(hourlyTime[i]);
      if(t <= now && hourlyAQI[i] != null){
        filteredAQI.push(hourlyAQI[i]);
        filteredTime.push(hourlyTime[i]);
      }
    }

    // ===== 24 HOUR CHART =====
    draw24Chart(filteredTime.slice(-24), filteredAQI.slice(-24));

    // ===== DAILY AVERAGE =====
    let dailyAQIMap = {};

    for(let i = 0; i < filteredAQI.length; i++){
      const date = filteredTime[i].split("T")[0];
      if(!dailyAQIMap[date]) dailyAQIMap[date] = [];
      dailyAQIMap[date].push(filteredAQI[i]);
    }

    let dailyDates = [];
    let dailyAQI = [];

    Object.keys(dailyAQIMap).sort().forEach(date => {
      const arr = dailyAQIMap[date];
      const avg = arr.reduce((a,b)=>a+b,0) / arr.length;
      dailyDates.push(date);
      dailyAQI.push(Math.round(avg));
    });

// ================= MIN / MAX AQI WITH TIME =================
if(filteredAQI.length > 0){

  let minAQI = filteredAQI[0];
  let maxAQI = filteredAQI[0];
  let minTime = filteredTime[0];
  let maxTime = filteredTime[0];

  for(let i = 0; i < filteredAQI.length; i++){
    if(filteredAQI[i] < minAQI){
      minAQI = filteredAQI[i];
      minTime = filteredTime[i];
    }

    if(filteredAQI[i] > maxAQI){
      maxAQI = filteredAQI[i];
      maxTime = filteredTime[i];
    }
  }

  const minEl = document.getElementById("minAQI");
  const maxEl = document.getElementById("maxAQI");

  if(minEl){
    const d = new Date(minTime);
    minEl.innerText = `${minAQI} on ${d.toLocaleDateString()} at ${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
  }

  if(maxEl){
    const d = new Date(maxTime);
    maxEl.innerText = `${maxAQI} on ${d.toLocaleDateString()} at ${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
  }
}

// ================= WEEKLY (MON → SUN) =================
const today = new Date();
const day = today.getDay();

const monday = new Date(today);
const diff = (day === 0 ? -6 : 1 - day);
monday.setDate(today.getDate() + diff);
monday.setHours(0,0,0,0);

let weekLabels = [];
let weekAQI = [];

for (let i = 0; i < 7; i++) {
  const d = new Date(monday);
  d.setDate(monday.getDate() + i);

  const dateStr = d.toISOString().split("T")[0];
  const index = dailyDates.indexOf(dateStr);

  if (index !== -1) {
    weekAQI.push(dailyAQI[index]);
  } else {
    weekAQI.push(null);
  }

  weekLabels.push(
    d.toLocaleDateString("en-US", { weekday: "short" })
  );
}

drawWeeklyChart(weekLabels, weekAQI);

// ================= MONTHLY =================
const currentYear = today.getFullYear();
let monthlyMap = {};

for (let i = 0; i < dailyDates.length; i++) {
  const d = new Date(dailyDates[i]);

  if (d.getFullYear() === currentYear) {
    const m = d.getMonth();
    if (!monthlyMap[m]) monthlyMap[m] = [];
    monthlyMap[m].push(dailyAQI[i]);
  }
}

let monthLabels = [];
let monthAQI = [];

Object.keys(monthlyMap).sort((a,b)=>a-b).forEach(m => {
  const arr = monthlyMap[m];
  const avg = arr.reduce((a,b)=>a+b,0) / arr.length;
  monthAQI.push(Math.round(avg));

  monthLabels.push(
    new Date(currentYear, m).toLocaleString("en-US", { month: "short" })
  );
});

drawMonthlyChart(monthLabels, monthAQI);
} catch(err){
  console.error("Chart AQI error:", err);
}
}

// ================= POLLUTANTS =================
async function loadPollutants(){
  try {
    const res = await fetch(`${BASE_URL}/api/pollutants?lat=${lat}&lon=${lon}`);
    const data = await res.json();

    if(!data.hourly) throw new Error("No pollutant data");

    const times = data.hourly.time;
    const now = new Date();

    function getClosestValue(values){
      let closestIndex = -1;
      let minDiff = Infinity;

      for(let i = 0; i < times.length; i++){
        if(values[i] == null) continue;

        const diff = Math.abs(now - new Date(times[i]));
        if(diff < minDiff){
          minDiff = diff;
          closestIndex = i;
        }
      }

      if(closestIndex === -1) return null;
      return Math.round(values[closestIndex]);
    }

    const pm25Val = getClosestValue(data.hourly.pm2_5);
    const pm10Val = getClosestValue(data.hourly.pm10);

    setPollutant("pm25", pm25Val);
    setPollutant("pm10", pm10Val);
    setPollutant("co", getClosestValue(data.hourly.carbon_monoxide));
    setPollutant("no2", getClosestValue(data.hourly.nitrogen_dioxide));
    setPollutant("so2", getClosestValue(data.hourly.sulphur_dioxide));
    setPollutant("o3", getClosestValue(data.hourly.ozone));

    // HERO SECTION VALUES
    document.getElementById("heroPM25").innerText = pm25Val ?? "--";
    document.getElementById("heroPM10").innerText = pm10Val ?? "--";

  } catch(err){
    console.error("Pollutant error:", err);
  }
}

// ================= POLLUTANT STATUS =================
function setPollutant(id, value){
  document.getElementById(id).innerText = value;

  let status = "Good";
  if(value > 50) status = "Moderate";
  if(value > 100) status = "Unhealthy";
  if(value > 200) status = "Very High";

  document.getElementById(id + "Status").innerText = status;
}

// ================= HEALTH ADVICE =================
function setHealthAdvice(aqi){

let level = "";
let tips = [];
let color = "";

if(aqi <= 50){
level = "🟢 Good Air Quality";
color = "#00e400";
tips = [
"Air quality is satisfactory",
"Perfect time for outdoor activities",
"You can open windows for ventilation",
"Best time for jogging and exercise"
];
}

else if(aqi <= 100){
level = "🟡 Moderate Air Quality";
color = "#ffff00";
tips = [
"Air quality is acceptable",
"Sensitive people should limit outdoor activity",
"Drink plenty of water",
"Monitor air quality updates"
];
}

else if(aqi <= 150){
level = "🟠 Unhealthy for Sensitive Groups";
color = "#ff7e00";
tips = [
"Children and elderly should avoid outdoor activity",
"Wear a mask outdoors",
"Avoid heavy outdoor exercise",
"Keep windows closed during peak pollution hours"
];
}

else if(aqi <= 200){
level = "🔴 Unhealthy Air Quality";
color = "#ff0000";
tips = [
"Avoid prolonged outdoor exposure",
"Wear N95/KN95 mask",
"Keep windows closed",
"Use air purifier",
"Drink plenty of water",
"Avoid outdoor exercise"
];
}

else if(aqi <= 300){
level = "🟣 Very Unhealthy Air Quality";
color = "#8f3f97";
tips = [
"Stay indoors as much as possible",
"Avoid outdoor activities",
"Use air purifier",
"Wear mask if going outside",
"People with asthma should keep inhaler ready"
];
}

else{
level = "⚫ Hazardous Air Quality";
color = "#7e0023";
tips = [
"Health warning: Emergency conditions",
"Stay indoors",
"Do not go outside",
"Use air purifier",
"Wear mask if outside",
"Seek medical help if breathing issues occur"
];
}

document.getElementById("healthLevel").innerText = level;
document.getElementById("healthLevel").style.color = color;

const list = document.getElementById("healthAdvice");
list.innerHTML = "";

tips.forEach(tip=>{
const li = document.createElement("li");
li.innerText = tip;
list.appendChild(li);
});

}

// ================= SECTION SWITCH =================
function showSection(id){
  document.querySelectorAll(".section").forEach(s => s.style.display="none");
  const section = document.getElementById(id);
  if(section) section.style.display="block";
}

window.showSection = showSection;

// ================= CHART FUNCTIONS =================
let chart24, chartWeekly, chartMonthly;

function draw24Chart(labels, values){
  const ctx = document.getElementById("aqiChart");
  if(chart24) chart24.destroy();

  chart24 = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels.map(t => new Date(t).getHours()+":00"),
      datasets: [{ label:"24 Hour AQI", data:values, borderColor:"#1a73e8", fill:true }]
    }
  });
}

function drawWeeklyChart(labels, values){
  const ctx = document.getElementById("weeklyChart");
  if(chartWeekly) chartWeekly.destroy();

  chartWeekly = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{ label:"Weekly AQI", data:values, backgroundColor:"#43a047" }]
    }
  });
}

function drawMonthlyChart(labels, values){
  const ctx = document.getElementById("monthlyChart");
  if(chartMonthly) chartMonthly.destroy();

  chartMonthly = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{ label:"Monthly AQI", data:values, borderColor:"#e53935", fill:true }]
    }
  });
}