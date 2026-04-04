let heatLayer = null;

function showCityHeatmap(map, lat, lon, aqi) {

  // ❌ Stop if invalid AQI
  if (!aqi || aqi === "Not Available" || aqi === "Limit Exceeded") {
    return;
  }

  // Remove old heatmap
  if (heatLayer) {
    map.removeLayer(heatLayer);
  }

  const pollutionFactor = Math.min(aqi / 300, 1);

  function generateHeatPoints(factor) {

    const points = [];
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

    points.push([lat, lon, factor]);

    return points;
  }

  function createHeatmap() {

    const radiusSize = 50 + (aqi * 0.4);

    heatLayer = L.heatLayer(generateHeatPoints(0.7), {
      radius: radiusSize,
      blur: 60,
      maxZoom: 18,
      gradient: {
        0.2: "#00e400",
        0.4: "#ffff00",
        0.6: "#ff7e00",
        0.8: "#ff0000",
        1.0: "#7e0023"
      }
    }).addTo(map);

    // ✅ Light animation (safe)
    setTimeout(() => {
      if (heatLayer) {
        heatLayer.setLatLngs(generateHeatPoints(0.9));
      }
    }, 800);
  }

  // ✅ Call ONCE after map movement
  map.once("moveend", createHeatmap);
}

export { showCityHeatmap };