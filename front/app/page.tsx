"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { albums } from "@/lib/api";
import { FRONT_ALBUM } from "@/lib/albums";
import { useList } from "@/lib/useList";
import SiteHeader from "./SiteHeader";

/** The public front page: sends the visitor on to the Pagrindinis album. */
export default function Home() {
  const router = useRouter();
  const albumList = useList(albums.list);
  const album = albumList.items?.find((album) => album.name === FRONT_ALBUM);

  useEffect(() => {
    if (album) router.replace(`/albums/${album.id}`);
  }, [album, router]);

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[1464px] flex-1 flex-col gap-12 px-4 py-10 md:px-8">
        {albumList.error && (
          <div className="banner-error" role="alert">
            {albumList.error}
          </div>
        )}
        {albumList.items && !album && <p className="text-muted">There is no {FRONT_ALBUM} album yet.</p>}
      </main>
    </div>
  );
}
