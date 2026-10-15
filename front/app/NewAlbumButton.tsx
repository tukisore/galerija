"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { albums } from "@/lib/api";

function today() {
  const now = new Date();
  // the local date, as yyyy-MM-dd
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** Opens a small form for a new album; once created, the album opens in its editor to be filled in. */
export default function NewAlbumButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const album = await albums.create({ name: name.trim(), startDate });
      router.push(`/admin/albums/${album.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        className="flex h-9 items-center rounded-md px-3 font-semibold ring-1 ring-white/25 hover:bg-white/10"
        onClick={() => setOpen(!open)}
      >
        New album
      </button>
      {open && (
        <form
          onSubmit={create}
          className="card absolute right-0 top-11 z-20 flex w-72 flex-col gap-3 p-4 text-foreground shadow-lg"
        >
          <label className="label">
            Name
            <input className="input" required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="label">
            Start date
            <input
              className="input"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          {error && (
            <div className="banner-error" role="alert">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={busy || !name.trim() || !startDate}>
              Create
            </button>
            <button type="button" className="btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
