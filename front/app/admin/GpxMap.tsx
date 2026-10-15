"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { fileUrl } from "@/lib/files";
import { parseGpx } from "@/lib/gpx";

/**
 * A map showing the track of a GPX media, fitted to the track.
 * It is a preview only (no panning or zooming), so it can sit inside draggable thumbnails.
 */
export default function GpxMap({ mediaId, className = "" }: { mediaId: string; className?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | undefined;

    async function draw() {
      // Leaflet needs the browser, so it is loaded here rather than at the top of the file
      const [{ default: L }, response] = await Promise.all([import("leaflet"), fetch(fileUrl(mediaId))]);
      if (!response.ok) throw new Error("Could not load the file");
      const points = parseGpx(await response.text());
      if (cancelled || !container.current) return;
      if (points.length === 0) return setProblem("No track in this file");

      map = L.map(container.current, {
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
        zoomSnap: 0.25,
      });
      map.attributionControl.setPrefix(false);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);
      const track = L.polyline(points, { color: "#e5484d", weight: 3 }).addTo(map);
      const end = { radius: 5, weight: 2, color: "#ffffff", fillOpacity: 1 };
      L.circleMarker(points[0], { ...end, fillColor: "#30a46c" }).addTo(map);
      L.circleMarker(points[points.length - 1], { ...end, fillColor: "#e5484d" }).addTo(map);
      map.fitBounds(track.getBounds(), { padding: [16, 16], maxZoom: 16 });
    }

    draw().catch((e) => !cancelled && setProblem(e instanceof Error ? e.message : String(e)));

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [mediaId]);

  return (
    <div className={`relative isolate ${className}`} role="img" aria-label="Map of the GPX track">
      {/* pointer-events-none: clicks and drags go to whatever holds the map */}
      <div ref={container} className="pointer-events-none h-full w-full" />
      {problem && (
        <span className="absolute inset-0 flex items-center justify-center bg-background p-3 text-center text-xs text-muted">
          {problem}
        </span>
      )}
    </div>
  );
}
