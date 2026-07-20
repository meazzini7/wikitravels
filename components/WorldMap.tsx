"use client";

import { useEffect, useState } from "react";
import { GeoJSON, MapContainer } from "react-leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Layer, PathOptions } from "leaflet";
import "leaflet/dist/leaflet.css";

interface CountryProps {
  name: string;
  iso_a3: string;
  iso_a2: string;
}

interface WorldMapProps {
  // Chiave = codice ISO alpha-3 (id nel geojson), valore = intensità (conteggio
  // viaggi in modalità "gradient", oppure 1/0 in modalità "binary").
  values: Record<string, number>;
  mode?: "gradient" | "binary";
  className?: string;
}

const GRADIENT_STEPS = ["#fff1f5", "#ffc2d6", "#fb6a9c", "#dd2166", "#7f1541"];
const EMPTY_FILL = "#e5e7eb";
const BINARY_FILL = "#28a19d";

export default function WorldMap({ values, mode = "gradient", className }: WorldMapProps) {
  const [geoData, setGeoData] = useState<FeatureCollection<Geometry, CountryProps> | null>(null);

  useEffect(() => {
    fetch("/world-countries.geo.json")
      .then((res) => res.json())
      .then(setGeoData)
      .catch((err) => console.error("Impossibile caricare la mappa del mondo:", err));
  }, []);

  const max = Math.max(1, ...Object.values(values));

  function styleFor(feature?: Feature<Geometry, CountryProps>): PathOptions {
    const id = feature?.properties?.iso_a3 ?? "";
    const value = values[id] ?? 0;
    let fillColor = EMPTY_FILL;
    if (mode === "binary") {
      fillColor = value > 0 ? BINARY_FILL : EMPTY_FILL;
    } else if (value > 0) {
      const ratio = value / max;
      const stepIndex = Math.min(GRADIENT_STEPS.length - 1, Math.ceil(ratio * (GRADIENT_STEPS.length - 1)));
      fillColor = GRADIENT_STEPS[stepIndex];
    }
    return { fillColor, fillOpacity: 1, color: "#ffffff", weight: 0.5 };
  }

  function onEachFeature(feature: Feature<Geometry, CountryProps>, layer: Layer) {
    const value = values[feature.properties.iso_a3] ?? 0;
    const label =
      mode === "binary"
        ? `${feature.properties.name}${value > 0 ? " · visitato" : ""}`
        : `${feature.properties.name}${value > 0 ? ` · ${value} viaggi` : ""}`;
    layer.bindTooltip(label, { sticky: true });
  }

  if (!geoData) {
    return <div className={className ?? "h-80 w-full animate-pulse rounded-lg bg-gray-100"} />;
  }

  return (
    <MapContainer
      center={[20, 10]}
      zoom={1}
      minZoom={1}
      scrollWheelZoom={false}
      className={className ?? "h-80 w-full rounded-lg"}
      attributionControl={false}
    >
      <GeoJSON data={geoData} style={styleFor} onEachFeature={onEachFeature} />
    </MapContainer>
  );
}
