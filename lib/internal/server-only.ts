// Project-local replacement for the `server-only` npm package.
//
// The official `server-only` package throws on import as a "you must bundle me
// through Next.js" landmine. That breaks tsx CLI scripts that legitimately need
// to import server-side helpers (price ingest, score recompute, etc.).
//
// This shim is aliased via tsconfig.json `paths` so any `import 'server-only'`
// resolves here in both Next.js and tsx. Behaviour:
//   - At runtime: no-op (empty module).
//   - At Next.js build time: Next's RSC compiler still enforces the server/client
//     boundary; accidental imports into a Client Component still fail.
//
// If you ever see this module appear in a client bundle, that's the signal to
// add an ESLint rule or revisit the architecture.
export {}
