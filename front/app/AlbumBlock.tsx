"use client";

import Link from "next/link";
import type { Album } from "@/lib/api";
import { formatDates, images } from "@/lib/albums";
import { fileUrl } from "@/lib/files";
import RichHtml from "./RichHtml";

function Tile({ mediaId, className = "", children }: { mediaId: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className={`relative min-h-0 overflow-hidden bg-border ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- served by the backend, not optimizable */}
      <img src={fileUrl(mediaId)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      {children}
    </div>
  );
}

/** An album as a block: its cover next to up to four more photos, then its name, dates and description. */
export default function AlbumBlock({ album }: { album: Album }) {
  const photos = images(album);
  const [cover, ...others] = photos;
  // the side grid is 2 × 2, or one column when there are not enough photos to fill it
  const side = others.slice(0, others.length >= 4 ? 4 : Math.min(others.length, 2));
  const more = photos.length - 1 - side.length;
  const dates = formatDates(album);

  return (
    <article>
      <Link href={`/albums/${album.id}`} className="group block">
        <div className="relative grid aspect-[2/1] grid-cols-5 gap-1 md:aspect-[3/1]">
          <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded bg-[#111113]/85 px-2 py-1 text-[11px] font-bold tracking-wider text-white">
            <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
              <rect x="2" y="5" width="9" height="9" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 2.5h8.5V11" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            ALBUM
          </div>
          {cover ? (
            <Tile mediaId={cover.id} className={side.length ? "col-span-3" : "col-span-5"} />
          ) : (
            <div className="col-span-5 flex items-center justify-center bg-border text-muted">No photos yet</div>
          )}
          {side.length > 0 && (
            <div className={`col-span-2 grid min-h-0 grid-rows-2 gap-1 ${side.length === 4 ? "grid-cols-2" : ""}`}>
              {side.map((media, index) => (
                <Tile key={media.id} mediaId={media.id} className={side.length === 1 ? "row-span-2" : ""}>
                  {more > 0 && index === side.length - 1 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#111317]/75 text-lg font-bold text-white">
                      +{more} more
                    </div>
                  )}
                </Tile>
              ))}
            </div>
          )}
        </div>
        <div className="px-0.5 pt-3">
          <div className="text-xs text-muted">
            {[`${photos.length} ${photos.length === 1 ? "photo" : "photos"}`, dates].filter(Boolean).join(" · ")}
          </div>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight group-hover:underline">{album.name}</h2>
        </div>
      </Link>
      {album.description && <RichHtml value={album.description} className="mt-1.5 px-0.5 text-muted" />}
    </article>
  );
}
