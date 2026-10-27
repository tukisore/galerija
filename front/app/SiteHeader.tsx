"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth, media, type Child, type User } from "@/lib/api";
import { appendChilds } from "@/lib/albums";
import { toUpload } from "@/lib/files";
import NewAlbumButton from "./NewAlbumButton";

const siteName = ">";

/**
 * The dark bar on top of the public pages. An admin also gets an Admin link and the New album and Upload buttons: the
 * photos and the new album are added to the end of albumId, the album being viewed (or left in no album without one);
 * onUploaded is called after the photos are in.
 */
export default function SiteHeader({ albumId, onUploaded }: { albumId?: string; onUploaded?: () => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [upload, setUpload] = useState<{ done: number; total: number } | null>(null);
  const [failed, setFailed] = useState<string[]>([]);

  async function uploadFiles(files: File[]) {
    setFailed([]);
    const uploaded: Child[] = [];
    for (const [index, file] of files.entries()) {
      setUpload({ done: index, total: files.length });
      try {
        uploaded.push({ type: "media", value: await media.create({ ...(await toUpload(file)), album: albumId }) });
      } catch (e) {
        setFailed((current) => [...current, `${file.name}: ${e instanceof Error ? e.message : String(e)}`]);
      }
    }
    if (albumId && uploaded.length) {
      try {
        await appendChilds(albumId, uploaded);
      } catch (e) {
        const reason = e instanceof Error ? e.message : String(e);
        setFailed((current) => [...current, `adding the photos to the album: ${reason}`]);
      }
    }
    setUpload(null);
    onUploaded?.();
  }

  useEffect(() => {
    let active = true;
    auth.me().then(
      (current) => active && setUser(current),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, []);

  return (
    <header className="bg-[#111113] text-white">
      <div className="mx-auto flex h-14 max-w-[1464px] items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#2f6fed]" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="12" cy="12" r="4.5" fill="currentColor" />
          </svg>
          {siteName}
        </Link>
        <div className="flex items-center gap-3">
          {user?.role === "admin" && (
            <Link href="/admin" className="flex h-9 items-center px-2 font-semibold text-white/80 hover:text-white">
              Admin
            </Link>
          )}
          {user?.role === "admin" && <NewAlbumButton parentId={albumId} />}
          {user?.role === "admin" && (
            <label
              className={`flex h-9 items-center gap-2 rounded-md bg-[#2f6fed] px-4 font-semibold focus-within:outline-2 focus-within:outline-white ${
                upload ? "cursor-wait opacity-70" : "cursor-pointer hover:bg-[#2460d8]"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={upload !== null}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  if (files.length) uploadFiles(files);
                }}
              />
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                <path
                  d="M8 13V3M3.5 7.5 8 3l4.5 4.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {upload ? `Uploading ${upload.done + 1} of ${upload.total}…` : "Upload"}
            </label>
          )}
          {user ? (
            <Link
              href="/login"
              title={user.name}
              aria-label={`Account: ${user.name}`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6f7d6c] font-semibold uppercase ring-1 ring-white/25"
            >
              {user.name.trim().charAt(0)}
            </Link>
          ) : (
            <Link href="/login" className="text-white/70 hover:text-white">
              Sign in
            </Link>
          )}
        </div>
      </div>
      {failed.length > 0 && (
        <div className="mx-auto flex max-w-[1464px] items-start justify-between gap-3 px-4 pb-3 text-sm text-[#f59a9a] md:px-8" role="alert">
          <span>Could not upload: {failed.join("; ")}</span>
          <button type="button" className="text-white/70 hover:text-white" onClick={() => setFailed([])}>
            Dismiss
          </button>
        </div>
      )}
    </header>
  );
}
