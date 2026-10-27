"use client";

import { useState } from "react";
import type { Album, Media } from "@/lib/api";
import { images, taken } from "@/lib/albums";
import { fileUrl, isImage } from "@/lib/files";

/** The media name, unless it is just the filename it was uploaded with. */
function title(media: Media) {
  return media.name === media.filename ? "" : media.name;
}

/**
 * A large random photo of the album: one of its own photos or one from its public sub-albums,
 * captioned with its name, the sub-album it is from and the year it was taken.
 */
export default function Hero({ album }: { album: Album }) {
  // picked once per visit, so the hero stays put when the album reloads
  const [pick] = useState(Math.random);

  const choices: { photo: Media; album?: Album }[] = (album.childs ?? []).flatMap((child) => {
    if (child.type === "media") return isImage(child.value.filename) ? [{ photo: child.value }] : [];
    if (child.type === "album" && child.value.public)
      return images(child.value).map((photo) => ({
        photo,
        album: child.value,
      }));
    return [];
  });
  const hero = choices[Math.floor(pick * choices.length)];
  const caption = hero && [title(hero.photo), hero.album?.name, taken(hero.photo).slice(0, 4)].filter(Boolean);

  return (
    <section className="relative h-[60vh] max-h-[640px] min-h-80 overflow-hidden bg-[#2a313b] text-white">
      {hero && (
        // eslint-disable-next-line @next/next/no-img-element -- served by the backend, not optimizable
        <img src={fileUrl(hero.photo.id)} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#111317]/40 to-[#111317]" />
      <div className="relative mx-auto flex h-full max-w-[1464px] flex-col justify-end gap-4 px-4 pb-10 md:flex-row md:items-end md:justify-between md:px-8 md:pb-14">
        <h1 className="max-w-2xl text-5xl font-extrabold leading-[0.95] tracking-tighter md:text-7xl">-</h1>
        {caption && caption.length > 0 && <p className="text-white/75">{caption.join(" · ")}</p>}
      </div>
    </section>
  );
}
