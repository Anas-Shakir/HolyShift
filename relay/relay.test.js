/**
 * In-process relay tests using a real ws server + clients on an ephemeral port.
 * Run with: npm test  (node --test)
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { WebSocketServer, WebSocket } from "ws";
import { attachRelay } from "./relay.js";

/** Start a relay on an ephemeral port; return { url, close }. */
function startRelay() {
  return new Promise((resolve) => {
    const wss = new WebSocketServer({ port: 0 }, () => {
      const { port } = wss.address();
      attachRelay(wss);
      resolve({
        url: `ws://127.0.0.1:${port}`,
        close: () => new Promise((r) => wss.close(r)),
      });
    });
  });
}

/** Open a client and resolve when connected. */
function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
  });
}

/** Next JSON message from a socket. */
function nextMessage(ws) {
  return new Promise((resolve) => {
    ws.once("message", (data) => resolve(JSON.parse(data.toString())));
  });
}

const relay = await startRelay();
after(() => relay.close());

test("pairs web + blender by code and notifies both", async () => {
  const web = await connect(relay.url);
  const blender = await connect(relay.url);

  const webPaired = nextMessage(web);
  const blenderPaired = nextMessage(blender);

  web.send(JSON.stringify({ type: "hello", role: "web", code: "PAIR1" }));
  blender.send(JSON.stringify({ type: "hello", role: "blender", code: "PAIR1" }));

  assert.deepEqual(await webPaired, { type: "paired", role: "blender" });
  assert.deepEqual(await blenderPaired, { type: "paired", role: "web" });

  web.close();
  blender.close();
});

test("forwards a sync from web to blender and result back", async () => {
  const web = await connect(relay.url);
  const blender = await connect(relay.url);
  web.send(JSON.stringify({ type: "hello", role: "web", code: "PAIR2" }));
  blender.send(JSON.stringify({ type: "hello", role: "blender", code: "PAIR2" }));
  await nextMessage(web); // paired
  await nextMessage(blender); // paired

  const blenderGotSync = nextMessage(blender);
  web.send(JSON.stringify({ type: "sync", scene: { hello: "world" } }));
  const forwarded = await blenderGotSync;
  assert.equal(forwarded.type, "sync");

  const webGotResult = nextMessage(web);
  blender.send(JSON.stringify({ type: "sync_result", ok: true, summary: "done" }));
  const result = await webGotResult;
  assert.deepEqual(result, { type: "sync_result", ok: true, summary: "done" });

  web.close();
  blender.close();
});

test("notifies peer with peer_left on disconnect", async () => {
  const web = await connect(relay.url);
  const blender = await connect(relay.url);
  web.send(JSON.stringify({ type: "hello", role: "web", code: "PAIR3" }));
  blender.send(JSON.stringify({ type: "hello", role: "blender", code: "PAIR3" }));
  await nextMessage(web);
  await nextMessage(blender);

  const webNotice = nextMessage(web);
  blender.close();
  assert.deepEqual(await webNotice, { type: "peer_left" });

  web.close();
});

test("errors when forwarding before hello", async () => {
  const c = await connect(relay.url);
  const err = nextMessage(c);
  c.send(JSON.stringify({ type: "sync", scene: {} }));
  const m = await err;
  assert.equal(m.type, "error");
  c.close();
});
