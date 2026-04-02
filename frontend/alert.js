export function checkAQIAlert(city, aqi) {

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