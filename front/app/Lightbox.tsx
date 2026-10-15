"use client";

import { useEffect, useRef } from "react";
import type { Media } from "@/lib/api";
import { fileUrl } from "@/lib/files";

/**
 * One photo over the whole screen, in the browser's fullscreen mode where it is allowed. Arrow keys
 * or the side buttons go through the other photos; Escape, the close button or a click beside the
 * photo closes it, and so does leaving fullscreen.
 */
export default function Lightbox({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: Media[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const media = photos[index];
  const hasPrevious = index > 0;
  const hasNext = index < photos.length - 1;

  // fullscreen is asked for once, when the viewer opens; a browser that refuses still gets the overlay
  useEffect(() => {
    const element = root.current;
    element?.focus();
    element?.requestFullscreen?.().catch(() => undefined);
    const closeOnExit = () => !document.fullscreenElement && onClose();
    document.addEventListener("fullscreenchange", closeOnExit);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("fullscreenchange", closeOnExit);
      document.body.style.overflow = overflow;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    };
  }, [onClose]);

  function keyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") onClose();
    else if (event.key === "ArrowLeft" && hasPrevious) onIndexChange(index - 1);
    else if (event.key === "ArrowRight" && hasNext) onIndexChange(index + 1);
    else return;
    event.preventDefault();
  }

  const sideButton = "absolute top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-4 py-3 text-2xl hover:bg-white/20";

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={media.name}
      tabIndex={-1}
      onKeyDown={keyDown}
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black p-4 text-white outline-none"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- served by the backend, not optimizable */}
      <img
        key={media.id}
        src={fileUrl(media.id)}
        alt={media.name === media.filename ? "" : media.name}
        className="min-h-0 max-w-full flex-1 object-contain"
      />
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-xl hover:bg-white/20"
      >
        ✕
      </button>
      {hasPrevious && (
        <button type="button" aria-label="Previous photo" onClick={() => onIndexChange(index - 1)} className={`${sideButton} left-4`}>
          ‹
        </button>
      )}
      {hasNext && (
        <button type="button" aria-label="Next photo" onClick={() => onIndexChange(index + 1)} className={`${sideButton} right-4`}>
          ›
        </button>
      )}
    </div>
  );
}
