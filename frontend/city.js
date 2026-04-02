// ================= GET DATA FROM LOCAL STORAGE =================
const city = localStorage.getItem("cityName");
const lat = parseFloat(localStorage.getItem("cityLat"));
const lon = parseFloat(localStorage.getItem("cityLon"));

if (!city || !lat || !lon) {
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
    const res = await fetch(`http://localhost:5000/api/aqi?lat=${lat}&lon=${lon}`);
    const data = await res.json();

    if(!data?.data) throw new Error("Invalid AQI data");

    const pollution = data.data.current.pollution;
    const aqi = pollution.aqius;

    document.getElementById("heroAQI").innerText = aqi;
    document.getElementById("heroAQI").style.color = getAQIColor(aqi);
    document.getElementById("heroStatus").innerText = getAQIStatus(aqi);

    // ✅ FIX: Added PM10
    document.getElementById("heroPM25").innerText = pollution.pm25 || "--";
    document.getElementById("heroPM10").innerText = pollution.pm10 || "--";

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
    const res = await fetch(`http://localhost:5000/api/weather?lat=${lat}&lon=${lon}`);
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
    const res = await fetch(`http://localhost:5000/api/aqi-chart?lat=${lat}&lon=${lon}`);
    const data = await res.json();

    if(!data.hourly) throw new Error("No chart data");

    const hourlyAQI = data.hourly.us_aqi;
    const hourlyTime = data.hourly.time;

    const now = new Date();
    let filteredAQI = [];
    let filteredTime = [];

    for(let i = 0; i < hourlyTime.length; i++){
      const t = new Date(hourlyTime[i]);
      if(t <= now && hourlyAQI[i] != null){
        filteredAQI.push(hourlyAQI[i]);
        filteredTime.push(hourlyTime[i]);
      }
    }

    draw24Chart(filteredTime.slice(-24), filteredAQI.slice(-24));

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

    drawWeeklyChart(dailyDates.slice(-7), dailyAQI.slice(-7));
    drawMonthlyChart(dailyDates.slice(-30), dailyAQI.slice(-30));

  } catch(err){
    console.error("Chart AQI error:", err);
  }
}

// ================= POLLUTANTS =================
async function loadPollutants(){
  try {
    const res = await fetch(`http://localhost:5000/api/pollutants?lat=${lat}&lon=${lon}`);
    const data = await res.json();

    if(!data.hourly) throw new Error("No pollutant data");

    const times = data.hourly.time;
    const now = new Date();

    function getClosestValue(values){
      let closestIndex = 0;
      let minDiff = Infinity;

      for(let i = 0; i < times.length; i++){
        if(values[i] == null) continue;
        const diff = Math.abs(now - new Date(times[i]));
        if(diff < minDiff){
          minDiff = diff;
          closestIndex = i;
        }
      }

      return Math.round(values[closestIndex]);
    }

    setPollutant("pm25", getClosestValue(data.hourly.pm2_5));
    setPollutant("pm10", getClosestValue(data.hourly.pm10));
    setPollutant("co", getClosestValue(data.hourly.carbon_monoxide));
    setPollutant("no2", getClosestValue(data.hourly.nitrogen_dioxide));
    setPollutant("so2", getClosestValue(data.hourly.sulphur_dioxide));
    setPollutant("o3", getClosestValue(data.hourly.ozone));

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