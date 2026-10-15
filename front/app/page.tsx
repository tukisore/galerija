"use client";

import { albums, looseMedia, type Album, type Media } from "@/lib/api";
import { images, taken } from "@/lib/albums";
import { fileUrl, isImage } from "@/lib/files";
import { useList } from "@/lib/useList";
import AlbumBlock from "./AlbumBlock";
import PhotoRows from "./PhotoRows";
import SiteHeader from "./SiteHeader";

/** A stretch of the front page: an album, or the loose photos between two albums. */
type Section = { album: Album } | { photos: Media[] };

/** The media name, unless it is just the filename it was uploaded with. */
function title(media: Media) {
  return media.name === media.filename ? "" : media.name;
}

function Hero({ photo, album }: { photo?: Media; album?: Album }) {
  const caption = photo && [title(photo), album?.name, taken(photo).slice(0, 4)].filter(Boolean);

  return (
    <section className="relative h-[60vh] max-h-[640px] min-h-80 overflow-hidden bg-[#2a313b] text-white">
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element -- served by the backend, not optimizable
        <img src={fileUrl(photo.id)} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#111317]/40 to-[#111317]" />
      <div className="relative mx-auto flex h-full max-w-[1464px] flex-col justify-end gap-4 px-4 pb-10 md:flex-row md:items-end md:justify-between md:px-8 md:pb-14">
        <h1 className="max-w-2xl text-5xl font-extrabold leading-[0.95] tracking-tighter md:text-7xl">
          Moments worth keeping.
        </h1>
        {caption && <p className="text-white/75">{["Latest photo", ...caption].join(" · ")}</p>}
      </div>
    </section>
  );
}

/**
 * The public front page: the photos that are in no album and the public albums, the latest added
 * first. The latest uploaded loose photo is also the hero.
 */
export default function Home() {
  const albumList = useList(albums.list);
  const looseList = useList(looseMedia);
  const error = albumList.error ?? looseList.error;

  // an admin is sent the private albums too; an album without photos has nothing to show yet
  const publicAlbums = (albumList.items ?? []).filter((album) => album.public && images(album).length > 0);
  const loose = (looseList.items ?? [])
    .filter((media) => isImage(media.filename))
    .sort((a, b) => b.created.localeCompare(a.created));
  // without loose photos the hero is the cover of the newest album, which stays in its block
  const newestAlbum = [...publicAlbums].sort((a, b) => albumDate(b).localeCompare(albumDate(a)))[0];
  const hero = loose[0] ?? (newestAlbum && images(newestAlbum)[0]);

  const entries = [
    ...publicAlbums.map((album) => ({ date: albumDate(album), album })),
    ...loose.map((photo) => ({ date: photo.created, photo })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const sections: Section[] = [];
  for (const entry of entries) {
    const last = sections.at(-1);
    if ("album" in entry) sections.push({ album: entry.album });
    else if (last && "photos" in last) last.photos.push(entry.photo);
    else sections.push({ photos: [entry.photo] });
  }
  const loaded = albumList.items && looseList.items;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader onUploaded={() => looseList.run(async () => {})} />
      <Hero photo={hero} album={loose.length ? undefined : newestAlbum} />

      <main className="mx-auto flex w-full max-w-[1464px] flex-1 flex-col gap-12 px-4 py-10 md:px-8">
        {error && (
          <div className="banner-error" role="alert">
            {error}
          </div>
        )}
        {loaded && !hero && sections.length === 0 && <p className="text-muted">There are no public photos yet.</p>}
        {sections.map((section) =>
          "album" in section ? (
            <AlbumBlock key={section.album.id} album={section.album} />
          ) : (
            <PhotoRows key={section.photos[0].id} photos={section.photos} />
          ),
        )}
      </main>
    </div>
  );
}

/**
 * Where the album sits among the photos: when it was made, as photos go by when they were uploaded.
 * Albums made before that was recorded go by their start date, which does not move when they are edited.
 */
function albumDate(album: Album) {
  return album.created || album.startDate || "";
}
