"use client";

import { useEffect, useState } from "react";
import { GeoJSON, MapContainer, useMap } from "react-leaflet";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
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
  // Inquadra automaticamente solo le nazioni con valore > 0 invece di
  // mostrare sempre il mondo intero: utile per il "mondo visitato"
  // personale, dove le mete potrebbero cadere fuori dalla vista di
  // default (es. un solo viaggio in Giappone) facendo sembrare la mappa
  // vuota anche se il conteggio città/nazioni è corretto.
  fitToValues?: boolean;
}

const GRADIENT_STEPS = ["#fff1f5", "#ffc2d6", "#fb6a9c", "#dd2166", "#7f1541"];
const EMPTY_FILL = "#e5e7eb";
const BINARY_FILL = "#28a19d";

function collectPositions(geom: Geometry): Position[] {
  if (geom.type === "Polygon") return geom.coordinates.flat(1);
  if (geom.type === "MultiPolygon") return geom.coordinates.flat(2);
  return [];
}

// Componente "figlio" (dentro <MapContainer>, unico posto dove useMap()
// è disponibile) che centra e zooma la mappa sul riquadro che contiene
// tutte le nazioni visitate, una tantum quando i dati sono pronti.
function FitToVisited({
  geoData,
  values,
}: {
  geoData: FeatureCollection<Geometry, CountryProps>;
  values: Record<string, number>;
}) {
  const map = useMap();

  useEffect(() => {
    const visitedIds = new Set(Object.keys(values).filter((id) => values[id] > 0));
    if (visitedIds.size === 0) return;

    let minLat = 90;
    let maxLat = -90;
    let minLng = 180;
    let maxLng = -180;
    let found = false;

    for (const feature of geoData.features as Feature<Geometry, CountryProps>[]) {
      const id = feature.properties?.iso_a3;
      if (!id || !visitedIds.has(id)) continue;
      for (const pos of collectPositions(feature.geometry)) {
        const [lng, lat] = pos;
        found = true;
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      }
    }
    if (!found) return;
    map.fitBounds(
      [
        [minLat, minLng],
        [maxLat, maxLng],
      ],
      { padding: [28, 28], maxZoom: 5 }
    );
    // Si vuole inquadrare di nuovo solo quando cambia davvero l'insieme
    // di nazioni visitate, non ad ogni render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoData, JSON.stringify(Object.keys(values).filter((id) => values[id] > 0).sort())]);

  return null;
}

export default function WorldMap({ values, mode = "gradient", className, fitToValues = false }: WorldMapProps) {
  const [geoData, setGeoData] = useState<FeatureCollection<Geometry, CountryProps> | null>(null);
  // La mappa è bloccata per non rubare lo scroll della pagina su mobile
  // (vedi dragging/touchZoom sotto): un piccolo bottone la sblocca per chi
  // vuole davvero esplorarla, invece di lasciarla permanentemente inerte.
  const [interactive, setInteractive] = useState(false);

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
    <div className="relative">
      <MapContainer
        center={[20, 10]}
        zoom={1}
        minZoom={1}
        scrollWheelZoom={false}
        // È una mappa decorativa (mostra sempre il mondo intero, zoom
        // minimo=massimo di default): senza bloccare il trascinamento, su
        // mobile un dito che scorre la pagina verticalmente veniva
        // "catturato" dalla mappa spostandola invece di far scorrere la
        // pagina. Si sblocca solo dopo un tap esplicito sul bottone qui sotto.
        dragging={interactive}
        touchZoom={interactive}
        doubleClickZoom={interactive}
        boxZoom={false}
        keyboard={interactive}
        className={className ?? "h-80 w-full rounded-lg"}
        attributionControl={false}
      >
        <GeoJSON data={geoData} style={styleFor} onEachFeature={onEachFeature} />
        {fitToValues && <FitToVisited geoData={geoData} values={values} />}
      </MapContainer>
      {!interactive && (
        <button
          type="button"
          onClick={() => setInteractive(true)}
          className="tap-scale absolute inset-x-0 bottom-2 mx-auto w-fit rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-gray-600 shadow-md"
        >
          👆 Tocca per esplorare
        </button>
      )}
    </div>
  );
}
