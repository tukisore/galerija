# Admin frontend

Next.js admin for the Scala backend: users, media and albums at `/admin`.

## Run

Start the backend first (`scala-cli run .` in the project root, port 8080), then:

```bash
npm install
npm run dev
```

Open http://localhost:3000/admin.

The browser calls the backend through `/api/*`, which `next.config.ts` forwards to
`http://localhost:8080`. Set `BACKEND_URL` to point at a different backend.
