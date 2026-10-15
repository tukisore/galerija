// Client for the Scala backend, reached through the /api rewrite in next.config.ts.

export const roles = ["admin", "editor", "viewer"] as const;

export type Role = (typeof roles)[number];

// created and updated are set by the backend on every entity; old rows may have none.
export type Stamps = { created?: string; updated?: string };

export type User = { id: string; name: string; email: string; role: Role } & Stamps;

export type Coordinates = { lat: number; lon: number };

export type Media = {
  id: string;
  name: string;
  filename: string;
  created: string;
  updated?: string;
  coordinates?: Coordinates;
  // left out by the backend when empty
  description?: string;
  // when the file itself was made: EXIF capture time (local, no zone) or else its last-modified time
  fileCreated?: string;
  // EXIF tags read from the file at upload, by tag name
  exif?: Record<string, string>;
};

/** body is the file as base64 (a data URL works too). */
export type MediaInput = {
  name?: string;
  filename?: string;
  body?: string;
  // the file's last-modified time, sent along with body
  fileDate?: string;
  coordinates?: Coordinates;
  description?: string;
};

export type Text = { id?: string; name: string } & Stamps;

// The backend leaves out childs when the list is empty.
// hoverImage is the id of the media shown when hovering the album.
// Dates are yyyy-MM-dd; albums saved before dates existed have no startDate.
export type Album = {
  id: string;
  name: string;
  childs?: Child[];
  hoverImage?: string;
  startDate?: string;
  endDate?: string;
  // rich text, like texts and media descriptions
  description?: string;
  // left out by the backend when false: albums are private unless made public
  public?: boolean;
} & Stamps;

export type Child =
  | { type: "album"; value: Album }
  | { type: "media"; value: Media }
  | { type: "text"; value: Text };

export type AlbumInput = {
  name: string;
  startDate: string;
  endDate?: string;
  description?: string;
  public?: boolean;
  childs?: Child[];
  hoverImage?: string;
};

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? `Request failed (${response.status})`);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

function resource<T, Input>(path: string) {
  return {
    list: () => request<T[]>(path),
    create: (input: Input) => request<T>(path, "POST", input),
    update: (id: string, input: Input) => request<T>(`${path}/${id}`, "PUT", input),
    remove: (id: string) => request<void>(`${path}/${id}`, "DELETE"),
  };
}

/** Sign-in by a one-time code sent to the user's email; the session lives in an HttpOnly cookie set by the backend. */
export const auth = {
  requestCode: (email: string) => request<{ message: string }>("/auth/request-code", "POST", { email }),
  login: (email: string, code: string) => request<User>("/auth/login", "POST", { email, code }),
  logout: () => request<void>("/auth/logout", "POST"),
  /** The signed-in user, or null when nobody is signed in. */
  me: async (): Promise<User | null> => {
    const response = await fetch("/api/auth/me");
    if (response.status === 401) return null;
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    return response.json();
  },
};

export const users = resource<User, Omit<User, "id">>("/users");
export const media = resource<Media, MediaInput>("/media");
export const albums = {
  ...resource<Album, AlbumInput>("/albums"),
  get: (id: string) => request<Album>(`/albums/${id}`),
};

/** The media that is in no album; unlike the rest of media it needs no sign-in. */
export const looseMedia = () => request<Media[]>("/media/loose");
