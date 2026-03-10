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

  // AQI influence factor
  const pollutionFactor = Math.min(aqi / 200, 1);

  // ================= GENERATE HEAT POINTS =================
  function generateHeatPoints(factor) {

    const points = [];

    const offsets = [
      [0,0],
      [0.02,0],
      [-0.02,0],
      [0,0.02],
      [0,-0.02],
      [0.04,0.04],
      [-0.04,-0.04],
      [0.04,-0.04],
      [-0.04,0.04]
    ];

    offsets.forEach(offset => {

      const dx = offset[0];
      const dy = offset[1];

      points.push([
        lat + dx,
        lon + dy,
        pollutionFactor * factor
      ]);

    });

    return points;

  }

  // ================= CREATE HEATMAP =================
  function createHeatmap() {

    const radiusSize = 70 + (aqi * 0.3);

    heatLayer = L.heatLayer(generateHeatPoints(intensity), {

      radius: radiusSize,
      blur: 50,
      maxZoom: 18,

      gradient: {

        0.2: "#2ecc71",   // green
        0.4: "#f1c40f",   // yellow
        0.6: "#e67e22",   // orange
        0.8: "#e74c3c",   // red
        1.0: "#8e44ad"    // purple

      }

    }).addTo(map);

    // ================= ANIMATION =================
    animationInterval = setInterval(() => {

      intensity += increasing ? 0.02 : -0.02;

      if (intensity >= 1) increasing = false;
      if (intensity <= 0.6) increasing = true;

      heatLayer.setLatLngs(generateHeatPoints(intensity));

    }, 400);

  }

  // Wait for map movement to finish
  map.once("moveend", createHeatmap);

}

// ================= EXPORT =================
export { showCityHeatmap };
