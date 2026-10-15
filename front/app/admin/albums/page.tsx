"use client";

import Link from "next/link";
import { useState } from "react";
import { albums, type Album, type Child } from "@/lib/api";
import { formatDates } from "@/lib/albums";
import { useList } from "@/lib/useList";
import HoverPreview from "../HoverPreview";
import PageHeader from "../PageHeader";
import Timestamp from "../Timestamp";
import DateInputs from "./DateInputs";

function summary(childs: Child[] = []) {
  if (childs.length === 0) return "Empty";
  return (["album", "media", "text"] as const)
    .map((type) => ({ type, count: childs.filter((child) => child.type === type).length }))
    .filter(({ count }) => count > 0)
    .map(({ type, count }) => `${count} ${type}${count > 1 && type !== "media" ? "s" : ""}`)
    .join(", ");
}

const noDates = { startDate: "", endDate: "" };

function AlbumLink({ album }: { album: Album }) {
  return (
    <Link href={`/admin/albums/${album.id}`} className="font-medium hover:text-accent hover:underline">
      {album.name}
    </Link>
  );
}

function dates(album: Album) {
  return formatDates(album) || <span className="text-muted">Not set</span>;
}

/** What each sortable column sorts by. */
const sortKeys = {
  id: (album: Album) => album.id,
  name: (album: Album) => album.name.toLowerCase(),
  visibility: (album: Album) => (album.public ? 0 : 1),
  dates: (album: Album) => album.startDate ?? "",
  contents: (album: Album) => album.childs?.length ?? 0,
  updated: (album: Album) => album.updated ?? "",
};

type Sort = { column: keyof typeof sortKeys; descending: boolean };

function compare(a: Album, b: Album, { column, descending }: Sort) {
  const [x, y] = [sortKeys[column](a), sortKeys[column](b)];
  const order = x < y ? -1 : x > y ? 1 : a.id.localeCompare(b.id);
  return descending ? -order : order;
}

/** A column heading that sorts the table by its column; clicking it again reverses the order. */
function SortHeader({ column, label, sort, onSort }: {
  column: Sort["column"];
  label: string;
  sort: Sort;
  onSort: (sort: Sort) => void;
}) {
  const active = sort.column === column;
  return (
    <th aria-sort={active ? (sort.descending ? "descending" : "ascending") : undefined}>
      <button
        type="button"
        className={`flex items-center gap-1 hover:text-foreground ${active ? "text-foreground" : ""}`}
        onClick={() => onSort({ column, descending: active && !sort.descending })}
      >
        {label}
        <span aria-hidden="true" className={active ? "" : "invisible"}>
          {sort.descending ? "↓" : "↑"}
        </span>
      </button>
    </th>
  );
}

export default function AlbumsPage() {
  const { items, error, run } = useList(albums.list);
  const [newName, setNewName] = useState("");
  const [newDates, setNewDates] = useState(noDates);
  const [sort, setSort] = useState<Sort>({ column: "id", descending: false });

  // sub-albums are edited from the album that holds them, so only the top-level ones are listed
  const subAlbumIds = new Set(
    (items ?? []).flatMap((album) => (album.childs ?? []).flatMap((child) => (child.type === "album" ? [child.value.id] : []))),
  );
  const topLevel = items?.filter((album) => !subAlbumIds.has(album.id)).sort((a, b) => compare(a, b, sort));

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (await run(() => albums.create({ name: newName.trim(), ...newDates }))) {
      setNewName("");
      setNewDates(noDates);
    }
  }

  function remove(album: Album) {
    if (confirm(`Delete album "${album.name}"? Its contents are kept.`)) run(() => albums.remove(album.id));
  }

  return (
    <>
      <PageHeader title="Albums" count={topLevel?.length} error={error} />

      <form onSubmit={create} className="card flex flex-wrap items-end gap-3 p-4">
        <label className="label min-w-40 flex-1">
          Name
          <input
            className="input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New album name"
          />
        </label>
        <DateInputs {...newDates} onChange={setNewDates} />
        <button className="btn btn-primary" disabled={!newName.trim()}>
          Add album
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              {(
                [
                  ["id", "Id"],
                  ["name", "Name"],
                  ["visibility", "Visibility"],
                  ["dates", "Dates"],
                  ["contents", "Contents"],
                  ["updated", "Updated"],
                ] as const
              ).map(([column, label]) => (
                <SortHeader key={column} column={column} label={label} sort={sort} onSort={setSort} />
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {topLevel?.map((album) => (
              <tr key={album.id}>
                <td className="font-mono text-muted">{album.id}</td>
                <td>
                  {album.hoverImage ? (
                    <HoverPreview mediaId={album.hoverImage} alt={`Hover image of ${album.name}`}>
                      <AlbumLink album={album} />
                    </HoverPreview>
                  ) : (
                    <AlbumLink album={album} />
                  )}
                </td>
                <td>
                  {album.public ? <span className="badge">Public</span> : <span className="text-muted">Private</span>}
                </td>
                <td className="whitespace-nowrap">{dates(album)}</td>
                <td className="text-muted">{summary(album.childs)}</td>
                <Timestamp created={album.created} updated={album.updated} />
                <td>
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/albums/${album.id}`} className="btn btn-small inline-flex items-center">
                      Edit
                    </Link>
                    <button className="btn btn-small btn-danger" onClick={() => remove(album)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {topLevel?.length === 0 && (
              <tr>
                <td colSpan={7} className="text-muted">
                  No albums yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
