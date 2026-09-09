/**
 * HolyShift relay core — pairs a "web" client and a "blender" client by code and forwards
 * messages between them. Holds NO scene logic and no persistent scene state.
 *
 * Exported as a function that attaches to a `ws` WebSocketServer so it can be unit-tested
 * in-process (see relay.test.js) and started by server.js.
 */

/**
 * @typedef {Object} Session
 * @property {import('ws').WebSocket=} web
 * @property {import('ws').WebSocket=} blender
 */

/** Send a JSON object to a socket if it is open. */
function send(socket, obj) {
  if (socket && socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(obj));
  }
}

/**
 * Attach relay behavior to a WebSocketServer.
 * @param {import('ws').WebSocketServer} wss
 * @returns {{ sessions: Map<string, Session> }}
 */
export function attachRelay(wss) {
  /** @type {Map<string, Session>} */
  const sessions = new Map();

  wss.on("connection", (socket) => {
    socket.isAlive = true;
    socket.role = null;
    socket.code = null;

    socket.on("message", (data) => {
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        send(socket, { type: "error", message: "Invalid JSON." });
        return;
      }

      // First meaningful message must be a hello to join a session.
      if (msg.type === "hello") {
        const { role, code } = msg;
        if ((role !== "web" && role !== "blender") || typeof code !== "string" || !code) {
          send(socket, { type: "error", message: "Invalid hello." });
          return;
        }
        socket.role = role;
        socket.code = code;

        const session = sessions.get(code) ?? {};
        if (session[role] && session[role] !== socket) {
          // Replace a stale socket of the same role.
          try {
            session[role].close();
          } catch {
            /* ignore */
          }
        }
        session[role] = socket;
        sessions.set(code, session);

        // If both roles are present, tell each about its peer.
        if (session.web && session.blender) {
          send(session.web, { type: "paired", role: "blender" });
          send(session.blender, { type: "paired", role: "web" });
        }
        return;
      }

      if (msg.type === "ping") {
        send(socket, { type: "pong" });
        return;
      }
      if (msg.type === "pong") {
        socket.isAlive = true;
        return;
      }

      // Forward everything else to the peer in the same session.
      if (!socket.code) {
        send(socket, { type: "error", message: "Say hello first." });
        return;
      }
      const session = sessions.get(socket.code);
      if (!session) return;
      const peer = socket.role === "web" ? session.blender : session.web;
      if (peer) {
        send(peer, msg);
      } else {
        send(socket, { type: "error", message: "No peer connected yet." });
      }
    });

    socket.on("pong", () => {
      socket.isAlive = true;
    });

    socket.on("close", () => {
      const code = socket.code;
      if (!code) return;
      const session = sessions.get(code);
      if (!session) return;
      // Remove this socket from its session and notify the peer.
      if (session[socket.role] === socket) delete session[socket.role];
      const peer = socket.role === "web" ? session.blender : session.web;
      send(peer, { type: "peer_left" });
      if (!session.web && !session.blender) sessions.delete(code);
    });
  });

  // Heartbeat: terminate sockets that stop responding.
  const interval = setInterval(() => {
    for (const socket of wss.clients) {
      if (socket.isAlive === false) {
        try {
          socket.terminate();
        } catch {
          /* ignore */
        }
        continue;
      }
      socket.isAlive = false;
      try {
        socket.ping();
      } catch {
        /* ignore */
      }
    }
  }, 30000);

  wss.on("close", () => clearInterval(interval));

  return { sessions };
}
