import type { Album, Media } from "./api";
import { isImage } from "./files";

/** The first image in the album or its sub-albums. */
export function firstImage(album: Album): Media | undefined {
  for (const child of album.childs ?? []) {
    if (child.type === "media" && isImage(child.value.filename)) return child.value;
    const nested = child.type === "album" ? firstImage(child.value) : undefined;
    if (nested) return nested;
  }
}

/** Id of the media that represents the album: its chosen hover image, or else its first image. */
export function coverId(album: Album): string | undefined {
  return album.hoverImage || firstImage(album)?.id;
}

/** "1 May 2026" or "1 May 2026 – 9 May 2026"; empty when the album has no start date. */
export function formatDates(album: Album): string {
  if (!album.startDate) return "";
  // T00:00 keeps the day from shifting: a bare yyyy-MM-dd would be read as UTC
  const format = (date: string) => new Date(`${date}T00:00`).toLocaleDateString(undefined, { dateStyle: "medium" });
  return album.endDate ? `${format(album.startDate)} – ${format(album.endDate)}` : format(album.startDate);
}

/** Every image in the album and its sub-albums, the cover first. */
export function images(album: Album): Media[] {
  const all = (album.childs ?? []).flatMap((child) => {
    if (child.type === "media") return isImage(child.value.filename) ? [child.value] : [];
    return child.type === "album" ? images(child.value) : [];
  });
  const unique = [...new Map(all.map((media) => [media.id, media])).values()];
  const cover = unique.find((media) => media.id === album.hoverImage);
  return cover ? [cover, ...unique.filter((media) => media !== cover)] : unique;
}

/** When the photo was taken, or else uploaded. */
export function taken(media: Media): string {
  return media.fileCreated || media.created;
}
