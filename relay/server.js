/**
 * HolyShift relay server entrypoint (deploys to Render, free tier).
 *
 * Starts an HTTP server (for a health check) and a WebSocket server, then attaches the
 * relay behavior. Render provides PORT via the environment.
 */
import http from "node:http";
import { WebSocketServer } from "ws";
import { attachRelay } from "./relay.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;

const server = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("HolyShift relay ok");
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });
attachRelay(wss);

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`HolyShift relay listening on :${PORT}`);
});
