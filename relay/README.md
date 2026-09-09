# HolyShift Relay

A tiny WebSocket relay that pairs the deployed HolyShift web app with a user's local
Blender by a short code, then forwards messages between them. It holds no scene logic and
no persistent state — it just matches two sockets and passes messages.

## Why a relay?

The web app is deployed on the public internet (Vercel) and Blender runs privately on the
user's machine (localhost, behind a firewall/NAT). Neither can reliably open a connection
to the other. Instead, both connect *outbound* to this relay, which pairs them by code.

## Run locally

```bash
cd relay
npm install
npm start          # listens on :8787 (or $PORT)
npm test           # in-process pairing/forwarding tests
```

## Deploy to Render (free tier)

1. New → Web Service → connect this repo, root directory `relay`.
2. Build command: `npm install`. Start command: `npm start`.
3. Render sets `PORT`; the server reads it. Health check path: `/health`.
4. Use the resulting `wss://<service>.onrender.com` URL as the web app's
   `NEXT_PUBLIC_RELAY_URL` and in the Blender add-on's connect panel.

Note: the free tier may sleep on inactivity and take a few seconds to wake. The web client
shows a "connecting…" state and retries; an active session sends periodic pings.

## Protocol

JSON over WebSocket. Message `type`s: `hello` (role + code), `paired`, `peer_left`, `sync`,
`sync_result`, `error`, `ping`/`pong`. See `../src/lib/sync/protocol.ts` for the shared
shapes (the web side validates with Zod; this relay treats bodies opaquely except `hello`).
