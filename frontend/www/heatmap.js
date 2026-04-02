let heatLayer = null;
let animationInterval = null;

let intensity = 0.7;
let increasing = true;

// ================= MAIN FUNCTION =================
function showCityHeatmap(map, lat, lon, aqi) {

  // Remove previous heatmap
  if (heatLayer) {
    map.removeLayer(heatLayer);
    clearInterval(animationInterval);
  }

  // AQI factor (0 → 1)
  const pollutionFactor = Math.min(aqi / 300, 1);

  // ================= GENERATE HEAT POINTS =================
  function generateHeatPoints(factor) {

    const points = [];

    // More realistic spread (circular dispersion)
    const radiusSpread = 0.05 + (aqi * 0.0003);

    for (let i = 0; i < 20; i++) {

      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * radiusSpread;

      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;

      points.push([
        lat + dx,
        lon + dy,
        pollutionFactor * factor
      ]);
    }

    // Center point (strongest pollution)
    points.push([lat, lon, 1 * factor]);

    return points;
  }

  // ================= CREATE HEATMAP =================
  function createHeatmap() {

    const radiusSize = 50 + (aqi * 0.4);

    heatLayer = L.heatLayer(generateHeatPoints(intensity), {

      radius: radiusSize,
      blur: 60,
      maxZoom: 18,

      gradient: {
        0.2: "#00e400",   // good
        0.4: "#ffff00",   // moderate
        0.6: "#ff7e00",   // unhealthy
        0.8: "#ff0000",   // very unhealthy
        1.0: "#7e0023"    // hazardous
      }

    }).addTo(map);

    // ================= SMOOTH ANIMATION =================
    animationInterval = setInterval(() => {

      intensity += increasing ? 0.015 : -0.015;

      if (intensity >= 1) increasing = false;
      if (intensity <= 0.6) increasing = true;

      heatLayer.setLatLngs(generateHeatPoints(intensity));

    }, 500);
  }

  // Wait for map movement to finish
  map.once("moveend", createHeatmap);
}

// ================= EXPORT =================
export { showCityHeatmap };