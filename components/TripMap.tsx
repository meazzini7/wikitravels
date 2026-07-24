"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerIcon2xPng from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";

// Leaflet cerca le icone di default con percorsi assoluti che il bundler di
// Next.js non risolve: le sostituiamo con gli asset importati staticamente.
const defaultIcon = L.icon({
  iconUrl: markerIconPng.src,
  iconRetinaUrl: markerIcon2xPng.src,
  shadowUrl: markerShadowPng.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export interface MapStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface TripMapProps {
  stops: MapStop[];
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
}

function ClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FitBounds({ stops }: { stops: MapStop[] }) {
  const map = useMap();
  useEffect(() => {
    if (stops.length === 0) return;
    if (stops.length === 1) {
      map.setView([stops[0].lat, stops[0].lng], 8);
      return;
    }
    const bounds = L.latLngBounds(stops.map((s) => [s.lat, s.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [stops, map]);
  return null;
}

const ROME: [number, number] = [41.9, 12.5];

export default function TripMap({ stops, onMapClick, className }: TripMapProps) {
  const center: [number, number] = stops.length > 0 ? [stops[0].lat, stops[0].lng] : ROME;

  return (
    <MapContainer
      center={center}
      zoom={stops.length ? 6 : 4}
      scrollWheelZoom
      // "relative z-0": senza uno z-index esplicito, i pannelli interni di
      // Leaflet (fino a z-index 700) non restano confinati nella stacking
      // context della mappa e "bucano" sopra ad altri elementi posizionati
      // della pagina, come il menu a tendina dei risultati di PlaceSearch.
      className={`relative z-0 ${className ?? "h-80 w-full rounded-lg"}`}
    >
      {/* Le tile OSM standard mostrano i nomi dei luoghi nello script/lingua
          locale (es. città giapponesi in giapponese): CARTO Voyager usa
          etichette in caratteri latini in tutto il mondo, gratis e senza
          bisogno di una chiave API. */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />
      <ClickHandler onMapClick={onMapClick} />
      <FitBounds stops={stops} />
      {stops.map((stop) => (
        <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={defaultIcon} />
      ))}
      {stops.length > 1 && (
        <Polyline positions={stops.map((s) => [s.lat, s.lng] as [number, number])} color="#dd2166" />
      )}
    </MapContainer>
  );
}
