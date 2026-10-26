# scala-web

Scala 3 backend ([Cask](https://com-lihaoyi.github.io/cask/) + Slick + SQLite or PostgreSQL) in `backend/`, with a Next.js frontend in `front/`.

## Running the server

Requires [Scala CLI](https://scala-cli.virtuslab.org/install) and a JDK 17+.

From the `backend` folder:

```bash
scala-cli run . --main-class Main
```

The server listens on http://localhost:8080.

`--main-class Main` is needed because the project has two entry points: `Main` (the server, in `Main.scala`) and `hello` (a standalone script in `hello.scala`).

Dependencies and the Scala version are declared in `project.scala` and are downloaded on the first run. The database tables (and, for SQLite, the database file) are created automatically on startup.

To restart automatically when a source file changes:

```bash
scala-cli run . --main-class Main --restart
```

Use `--restart`, not `--watch`: `--watch` recompiles on a change but waits for the program to exit before running it again, and a server never exits, so it keeps serving the old code.

## Configuration

All settings are optional. Put them in `backend/.env` (start from `backend/.env.example`; `.env` is git-ignored) or set them as environment variables, which take precedence over the file.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DB_URL` | unset | PostgreSQL JDBC URL, e.g. `jdbc:postgresql://localhost:5432/scalaweb`; when unset, SQLite is used |
| `DB_USER` | empty | PostgreSQL user |
| `DB_PASSWORD` | empty | PostgreSQL password |
| `DB_PATH` | `db` | SQLite database file, used when `DB_URL` is unset |
| `MEDIA_DIR` | `media` | Directory for uploaded media files |
| `JWT_SECRET` | built-in fallback | Secret used to sign login tokens; set it in production |
| `COOKIE_SECURE` | unset | Set to `true` to mark the auth cookie `Secure` (HTTPS only) |
| `MAILERSEND_API_KEY` | unset | [MailerSend](https://www.mailersend.com) API token; when unset, emails are printed to the server console instead of sent |
| `MAIL_FROM` | `no-reply@localhost` | Sender address, on a domain verified in MailerSend |
| `MAIL_FROM_NAME` | empty | Sender name |

Example:

```bash
DB_PATH=/var/data/app.db MEDIA_DIR=/var/data/media scala-cli run . --main-class Main
```

## Frontend

The frontend proxies `/api/*` to the backend, so start the server first.

```bash
cd front
npm install
npm run dev
```

It runs on http://localhost:3000. Set `BACKEND_URL` if the backend is not at `http://localhost:8080`.

## Docker

To run everything in containers instead, from the project root:

```bash
docker compose up -d --build
```

The site is then at http://localhost:3000 (set `FRONT_PORT` to use another port). The backend is not published; the front reaches it inside the compose network.

- The backend reads its settings from `backend/.env`, as in development, and uses the same `backend/db` and `backend/media`.
- The backend image is Ubuntu 24.04 with its OpenJDK 21 and Scala CLI 1.17.1 (the `SCALA_CLI_VERSION` build argument), and starts the server with `scala-cli run`.
- PostgreSQL 17 runs as `postgres` on `127.0.0.1:5432`, with user, password and database `scalaweb` unless `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB` are set. The backend does not use it yet: it still stores its data in SQLite.
- Stop `npm run dev` first, or set `FRONT_PORT`, since both use port 3000.
