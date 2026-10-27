"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { albums, auth, type Album, type Child, type Media } from "@/lib/api";
import { FRONT_ALBUM, formatDates, images } from "@/lib/albums";
import { isImage } from "@/lib/files";
import AlbumBlock from "../../AlbumBlock";
import Hero from "../../Hero";
import PhotoRows from "../../PhotoRows";
import RichHtml from "../../RichHtml";
import SiteHeader from "../../SiteHeader";

/** The album's childs in their order, with each run of photos shown together as rows. */
function Contents({ childs }: { childs: Child[] }) {
  const parts: React.ReactNode[] = [];
  let photos: Media[] = [];
  const flush = () => {
    if (photos.length) parts.push(<PhotoRows key={photos[0].id} photos={photos} />);
    photos = [];
  };
  for (const child of childs) {
    if (child.type === "media") {
      if (isImage(child.value.filename)) photos.push(child.value);
      continue;
    }
    // a sub-album that is not public would not open for a visitor
    if (child.type === "album" && !child.value.public) continue;
    flush();
    if (child.type === "album") parts.push(<AlbumBlock key={child.value.id} album={child.value} />);
    else parts.push(<RichHtml key={child.value.id} value={child.value.name} className="max-w-3xl text-base" />);
  }
  flush();
  return parts;
}

/**
 * A public album: its name, dates and description, then its photos, texts and sub-albums.
 * The front album has a random photo in place of its name.
 */
export default function AlbumView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [album, setAlbum] = useState<Album | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  // the album that holds this one, for a sub-album; visitors are only sent public albums
  const [parent, setParent] = useState<Album | null>(null);

  useEffect(() => {
    let active = true;
    albums.list().then(
      (all) =>
        active &&
        setParent(
          all.find((other) => other.childs?.some((child) => child.type === "album" && child.value.id === id)) ?? null,
        ),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;
    auth.me().then(
      (user) => active && setIsAdmin(user?.role === "admin"),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    albums.get(id).then(
      (loaded) => active && setAlbum(loaded),
      (e) => active && setError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      active = false;
    };
  }, [id]);

  // after photos are uploaded into this album from the header
  const reload = useCallback(() => {
    albums.get(id).then(setAlbum, (e) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  const count = album ? images(album).length : 0;
  const isFront = album?.name === FRONT_ALBUM;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader albumId={id} onUploaded={reload} />
      {album && isFront && <Hero album={album} />}
      <main className="mx-auto flex w-full max-w-[1464px] flex-1 flex-col gap-10 px-4 py-10 md:px-8">
        {error && (
          <div className="banner-error" role="alert">
            {error}
          </div>
        )}
        {album && (
          <>
            <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
              <div className="min-w-0 flex-1">
                {!isFront && (
                  <h1 className="flex items-center gap-3 text-4xl font-extrabold tracking-tighter md:text-5xl">
                    {parent && (
                      <Link
                        href={`/albums/${parent.id}`}
                        aria-label={`Back to ${parent.name}`}
                        title={parent.name}
                        className="font-normal text-muted hover:text-foreground"
                      >
                        ←
                      </Link>
                    )}
                    {album.name}
                  </h1>
                )}
                {album.description && <RichHtml value={album.description} className="mt-3 max-w-3xl text-muted" />}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted">
                  {[`${count} ${count === 1 ? "photo" : "photos"}`, formatDates(album)].filter(Boolean).join(" · ")}
                </div>
                {isAdmin && (
                  <Link href={`/admin/albums/${album.id}`} className="btn btn-primary inline-flex items-center">
                    Edit album
                  </Link>
                )}
              </div>
            </header>
            <Contents childs={album.childs ?? []} />
          </>
        )}
      </main>
    </div>
  );
}
