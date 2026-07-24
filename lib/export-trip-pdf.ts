"use client";

import jsPDF from "jspdf";
import type { Trip, TripStop } from "./types";

export function exportTripPdf(trip: Trip, stops: TripStop[]) {
  const doc = new jsPDF();
  const marginX = 14;
  let y = 20;

  doc.setFontSize(18);
  doc.text(trip.title, marginX, y);
  y += 8;

  doc.setFontSize(11);
  doc.text(`${trip.startDate} - ${trip.endDate}`, marginX, y);
  y += 6;
  doc.text(`Distanza totale: ${trip.totalDistanceKm.toFixed(0)} km`, marginX, y);
  y += 10;

  doc.setFontSize(14);
  doc.text("Tappe", marginX, y);
  y += 8;
  doc.setFontSize(11);

  stops.forEach((stop, i) => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    doc.text(`${i + 1}. ${stop.name}`, marginX, y);
    y += 6;
    doc.text(`   ${stop.startDate} - ${stop.endDate}`, marginX, y);
    y += 6;
    if (stop.poiRatings && stop.poiRatings.length > 0) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      const poiLine = stop.poiRatings.map((p) => `${p.name} (${p.rating}/10)`).join(", ");
      const poiLines = doc.splitTextToSize(`   Da vedere: ${poiLine}`, 180);
      doc.text(poiLines, marginX, y);
      y += poiLines.length * 6;
    }
    y += 4;
  });

  const filename = `${
    trip.title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "viaggio"
  }.pdf`;
  doc.save(filename);
}
