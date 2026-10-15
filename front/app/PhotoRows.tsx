"use client";

import { useCallback, useState } from "react";
import type { Media } from "@/lib/api";
import { taken } from "@/lib/albums";
import { fileUrl } from "@/lib/files";
import Lightbox from "./Lightbox";
import RichHtml from "./RichHtml";

function formatTaken(media: Media) {
  const date = new Date(taken(media));
  return isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

/**
 * Photos in rows of equal height, each with its date and description underneath. A photo keeps its
 * own width and grows to fill its row; the spacer takes the leftover space of the last row, so that
 * row is not stretched. A click on a photo opens it fullscreen.
 */
export default function PhotoRows({ photos }: { photos: Media[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);

  return (
    <div className="flex flex-wrap gap-x-1 gap-y-6 after:flex-[999] after:content-['']">
      {photos.map((media, index) => (
        <figure key={media.id} className="max-w-full flex-grow">
          <button
            type="button"
            aria-label={`Open ${media.name} fullscreen`}
            onClick={() => setOpen(index)}
            className="block h-40 w-full cursor-zoom-in bg-border sm:h-52 lg:h-60"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- served by the backend, not optimizable */}
            <img
              src={fileUrl(media.id)}
              alt={media.name === media.filename ? "" : media.name}
              loading="lazy"
              className="h-full min-w-full max-w-full object-cover"
            />
          </button>
          {/* w-0 keeps a long caption from widening the photo: it wraps to the photo's width instead */}
          <figcaption className="w-0 min-w-full px-0.5 pt-2">
            <div className="text-xs text-muted">{formatTaken(media)}</div>
            {media.description && <RichHtml value={media.description} className="mt-0.5 line-clamp-2" />}
          </figcaption>
        </figure>
      ))}
      {open !== null && (
        <Lightbox photos={photos} index={open} onIndexChange={setOpen} onClose={close} />
      )}
    </div>
  );
}
