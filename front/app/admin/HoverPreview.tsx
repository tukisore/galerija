"use client";

import { useState } from "react";
import { fileUrl } from "@/lib/files";
import GpxMap from "./GpxMap";

const previewSize = 240;

/** Shows the image of a media, or the map of a GPX media, next to its children while they are hovered or focused. */
export default function HoverPreview({
  mediaId,
  alt,
  kind = "image",
  children,
}: {
  mediaId: string;
  alt: string;
  kind?: "image" | "gpx";
  children: React.ReactNode;
}) {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  // fixed to the viewport so the scrolling table does not clip it; opens above when there is no room below
  function show(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const below = rect.bottom + 8 + previewSize <= window.innerHeight;
    setPosition({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - previewSize - 8)),
      top: below ? rect.bottom + 8 : Math.max(8, rect.top - 8 - previewSize),
    });
  }

  return (
    <span
      tabIndex={0}
      className="cursor-zoom-in underline decoration-dotted underline-offset-4"
      onMouseEnter={(e) => show(e.currentTarget)}
      onMouseLeave={() => setPosition(null)}
      onFocus={(e) => show(e.currentTarget)}
      onBlur={() => setPosition(null)}
    >
      {children}
      {position && (
        <span
          className="card pointer-events-none fixed z-10 flex items-center justify-center p-1 shadow-lg"
          style={{ ...position, width: previewSize, height: previewSize }}
        >
          {kind === "gpx" ? (
            <GpxMap mediaId={mediaId} className="h-full w-full overflow-hidden rounded-md" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- served by the backend, not optimizable
            <img src={fileUrl(mediaId)} alt={alt} className="max-h-full max-w-full rounded-md object-contain" />
          )}
        </span>
      )}
    </span>
  );
}
