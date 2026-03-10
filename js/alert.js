export function checkAQIAlert(city, aqi) {

  const alertBox = document.getElementById("aqiAlert");
  const title = document.getElementById("aqiAlertTitle");
  const msg = document.getElementById("aqiAlertMessage");
  const closeBtn = document.getElementById("aqiAlertClose");
  const box = alertBox.querySelector(".aqi-alert-box");

  // Do not show alert if AQI is safe
  if (aqi <= 100) {
    alertBox.classList.add("hidden");
    return;
  }

  // Reset previous styles
  box.className = "aqi-alert-box";

  // ALERT LEVELS
  if (aqi <= 150) {

    title.innerText = "⚠️ Air Quality Alert";

    msg.innerHTML =
      `<b>City:</b> ${city}<br>
       <b>AQI:</b> ${aqi}<br>
       <b>Level:</b> Unhealthy<br>
       <b>Advice:</b> Limit outdoor activities`;

    box.classList.add("aqi-unhealthy");

  }
  else if (aqi <= 200) {

    title.innerText = "🚨 Severe AQI Alert";

    msg.innerHTML =
      `<b>City:</b> ${city}<br>
       <b>AQI:</b> ${aqi}<br>
       <b>Level:</b> Very Unhealthy<br>
       <b>Advice:</b> Wear mask & avoid travel`;

    box.classList.add("aqi-very");

  }
  else {

    title.innerText = "☠️ EMERGENCY AQI ALERT";

    msg.innerHTML =
      `<b>City:</b> ${city}<br>
       <b>AQI:</b> ${aqi}<br>
       <b>Level:</b> Hazardous<br>
       <b>Advice:</b> Stay indoors. Schools should close.`;

    box.classList.add("aqi-danger");

  }

  // Show alert
  alertBox.classList.remove("hidden");

  // Close button functionality
  closeBtn.addEventListener("click", () => {
    alertBox.classList.add("hidden");
  });

}