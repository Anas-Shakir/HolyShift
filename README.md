<div align="center">

# HolyShift

### An AI-powered 3D scene prototyper for Blender

**Describe a 3D world in plain language, see it instantly in the browser, refine it by talking, hand, or AI, then sync it straight into Blender.**

[Live Demo](https://holyshift-git-main-anas-shakirs-projects.vercel.app/) · [Report a Bug](../../issues) · [Request a Feature](../../issues)

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![Three.js](https://img.shields.io/badge/Three.js-r186-000?logo=three.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript)
![Groq](https://img.shields.io/badge/AI-Groq-f55036)
![Blender](https://img.shields.io/badge/Blender-4.2%20LTS-ea7600?logo=blender)
![Tests](https://img.shields.io/badge/tests-158%20passing-3fb950)
![License](https://img.shields.io/badge/license-MIT-blue)

</div>

---

## Overview

Creating even a simple 3D scene in Blender means many manual steps — create objects, position
them, scale them, assign materials, set up lighting — before you can evaluate an idea. That
interaction cost is highest exactly when you're still exploring what you want.

**HolyShift** collapses that gap. It is a conversational workspace built around one core idea:

> **Intent → Structured World State → Preview → Iterative Refinement → Blender**

Instead of treating every prompt as a one-shot "prompt → generate" request, HolyShift maintains
a persistent, machine-readable representation of your 3D world. The AI reasons over that existing
state, so you can build up a scene through conversation:

> _"Create a cozy study room."_ → _"Make the desk wider."_ → _"Move the chair closer."_ →
> _"Add a potted plant on the desk."_ → _"Sync to Blender."_

The browser is the fast ideation layer. Blender remains the final authoring environment. The
structured scene state is the single source of truth that keeps them in agreement.

---

## Key Features

- **🗣️ State-aware AI scene agent** — Natural-language creation and editing powered by
  [Groq](https://groq.com). The AI reasons over the current world and returns *validated,
  structured changes* — never arbitrary code — so edits are predictable and incremental.
- **⚡ Instant browser preview** — A live [React Three Fiber](https://r3f.docs.pmnd.rs/) /
  Three.js viewport renders the scene in real time as it changes.
- **🧩 Rich, composable vocabulary** — Primitives (cube, sphere, cylinder, plane, cone, torus,
  prism), a library of pre-built objects (chair, desk, sofa, bed, bookshelf, plant, lamp, and
  more), and a **`group`** mechanism that lets the AI compose *novel* objects out of primitives
  on the fly (e.g. a potted plant = pot cylinder + foliage sphere).
- **🖱️ Direct manipulation** — Click to select, drag a move/rotate/scale gizmo, or type exact
  numeric transforms. Every hand-edit flows through the same state as the AI.
- **🔎 Pre-sync verification & self-correction** — A deterministic checker catches floating
  objects, interpenetration, below-floor placement, and bad scale, and offers one-click fixes.
  An optional AI vision tier reviews the preview for semantic placement issues.
- **🔌 Deterministic Blender sync** — A Blender 4.2 add-on rebuilds the scene using the
  `bpy.data` API (never fragile `bpy.ops`), reproducing your world faithfully and repeatably.
- **🌐 Works with a deployed web app + local Blender** — A lightweight relay pairs the public
  web app with your private local Blender via a short code — no localhost/firewall gymnastics.

---

## How It Works

HolyShift is three cooperating pieces. The deployed web app and your local Blender both connect
*outbound* to a small always-on relay, which pairs them by a short code and forwards messages —
so a public website can drive a private, local Blender instance.

```text
┌──────────────────────────┐      ┌───────────────────────┐      ┌──────────────────────────┐
│   Web App (Vercel)        │      │   Relay (Render)       │      │   Local Blender + Add-on   │
│                           │      │   Node.js + ws         │      │                            │
│  React + R3F preview      │      │                        │      │  WS client (bg thread)     │
│  Scene state = SOURCE     │─WS──▶│  Pairs 2 sockets by    │◀─WS──│        ↓ queue             │
│    OF TRUTH (Zustand)     │      │  code; forwards msgs;  │      │  bpy.app.timers (main)     │
│  AI agent via /api/agent  │      │  holds no scene logic  │      │  → bpy.data compiler       │
│  Verification (pre-sync)  │      │                        │      │  → real Blender objects    │
└──────────────────────────┘      └───────────────────────┘      └──────────────────────────┘

Edit → apply to Scene State → preview re-renders → [Verify & fix] → [Sync to Blender]
     → relay → add-on → deterministic compiler → Blender scene
```

### Design principles

1. **Structured state is the single source of truth.** The preview and Blender are *derived
   views*. The AI, the gizmo, and numeric inputs all mutate the same validated state.
2. **The AI produces intent, not code.** It emits structured operations constrained to a closed
   capability manifest, validated with [Zod](https://zod.dev). It can never request something
   the renderer or the Blender compiler can't build.
3. **Deterministic execution.** The Blender compiler is a fixed library of tested `bpy.data`
   operations — context-independent and reliable, rather than arbitrary generated Python.
4. **Verify before you commit.** Problems are caught and fixed in the web state *before* syncing,
   so Blender always receives a known-good scene.

---

## The Conversational Loop

| Step | You do | HolyShift does |
|------|--------|----------------|
| **Describe** | _"Create a compact study room with a desk, chair, lamp, and bookshelf."_ | Interprets intent → structured scene → instant preview |
| **Refine** | _"Make the desk wider and move the chair closer."_ | Resolves references, applies incremental edits, preserves everything else |
| **Compose** | _"Add a potted plant on the desk."_ | Builds a novel object from primitives via a `group` |
| **Adjust** | Drag the gizmo / type exact values | Commits the transform to the source-of-truth state |
| **Verify** | Click **Verify scene** | Flags floating/overlapping/below-floor objects, offers one-click fixes |
| **Sync** | Click **Sync to Blender** | Deterministically rebuilds the scene in your local Blender |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Web app** | Next.js 15 (App Router), React 19, TypeScript |
| **3D preview** | Three.js (r186), React Three Fiber 9, drei |
| **State** | Zustand (browser-authoritative), Zod (schema + validation) |
| **AI** | Groq API — structured output for the scene agent; optional Llama 4 vision for verification |
| **Relay** | Node.js + `ws` (deployed on Render) |
| **Blender** | Blender 4.2 LTS add-on — `bpy.data` / `bmesh`, background-thread WebSocket + main-thread timer |
| **Testing** | Vitest + React Testing Library (web); headless Blender conformance harness (add-on) |
| **Hosting** | Vercel (web + serverless API routes), Render (relay) — all free-tier friendly |

---

## Project Structure

```text
HolyShift/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/agent/          # Groq scene-agent proxy (server-side key)
│   │   └── api/verify/         # optional AI vision verification
│   ├── components/             # UI + R3F preview (SceneCanvas, gizmo, panels)
│   │   └── preview/            # renderers, selection, transform gizmo
│   ├── lib/
│   │   ├── scene/              # canonical schema, factory, operations, serialization
│   │   ├── agent/              # capability manifest, patch schema, Groq client, apply
│   │   ├── verify/             # geometric checks, fixes, vision tier
│   │   └── sync/               # shared relay protocol + web sync hook
│   └── store/                  # Zustand scene store (source of truth)
├── relay/                      # Node + ws relay (deploys to Render)
├── blender/
│   ├── holyshift_addon/        # installable Blender 4.2 add-on
│   └── tests/                  # headless-Blender conformance harness
├── .kiro/specs/                # spec-driven development artifacts (see below)
└── docs/                       # product blueprint
```

---

## Built With Kiro — Spec-Driven Development

HolyShift was built with [Kiro](https://kiro.dev) using a disciplined spec-driven workflow.
Every feature began as a spec — **requirements → design → tasks** — implemented task-by-task
with tests. Those artifacts live in [`.kiro/specs/`](.kiro/specs) and document the whole build:

| Spec | Scope |
|------|-------|
| `core-scene-state` | Canonical scene schema, state engine, app skeleton |
| `browser-3d-preview` | React Three Fiber rendering of the structured state |
| `ai-scene-agent` | Groq-powered natural-language creation & iterative editing |
| `blender-sync` | Relay, Blender add-on, deterministic `bpy.data` compiler |
| `scene-vocabulary` | Additional primitives, seeded objects, `group` composition |
| `direct-manipulation` | Viewport selection + move/rotate/scale gizmo + numeric inputs |
| `scene-verification` | Deterministic geometric checks + optional AI vision review |

The full product vision is in [`docs/PROJECT_BLUEPRINT.md`](docs/PROJECT_BLUEPRINT.md).

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- A **[Groq API key](https://console.groq.com/keys)** (free tier works)
- **Blender 4.2 LTS+** (only needed for the Blender-sync feature)

### 1. Web app (local)

```bash
git clone https://github.com/Anas-Shakir/HolyShift.git
cd HolyShift
npm install

# create .env.local (see .env.example)
#   GROQ_API_KEY=your_key_here
#   GROQ_MODEL=openai/gpt-oss-20b            # optional; default is set in code
#   NEXT_PUBLIC_RELAY_URL=wss://your-relay   # optional; only for Blender sync
#   GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct  # optional; AI verification

npm run dev
# open http://localhost:3000
```

The full **describe → preview → refine → verify** loop works with just a Groq key. Blender sync
is optional and requires the relay + add-on below.

### 2. Relay (for Blender sync)

The relay lets the deployed web app reach your local Blender. Deploy it to
[Render](https://render.com) (free tier), or run it locally:

```bash
cd relay
npm install
npm start            # listens on :8787 (or $PORT)
```

Set the web app's `NEXT_PUBLIC_RELAY_URL` to the relay's `wss://…` URL. See
[`relay/README.md`](relay/README.md) for Render deployment steps.

### 3. Blender add-on (for Blender sync)

1. Zip the `blender/holyshift_addon` folder.
2. In Blender: **Edit → Preferences → Add-ons → Install…** → select the zip → enable **HolyShift Sync**.
3. Open the 3D viewport sidebar (`N`) → **HolyShift** tab, enter the relay URL and the pairing
   code shown in the web app, and click **Connect**.

The add-on needs the `websocket-client` package in Blender's Python — see
[`blender/holyshift_addon/README.md`](blender/holyshift_addon/README.md).

---

## Scripts

```bash
npm run dev         # start the dev server
npm run build       # production build
npm run start       # serve the production build
npm run test        # run the test suite (Vitest)
npm run lint        # lint
npm run typecheck   # TypeScript type-check
```

**Blender conformance tests** (requires a local Blender install):

```bash
blender --background --python blender/tests/conformance.py
```

---

## Testing

- **158 web tests** across 21 files (Vitest + React Testing Library) cover the scene engine,
  the AI patch/apply logic, geometric verification, and the UI/state.
- A **headless-Blender conformance harness** compiles every supported entity inside a real
  Blender and asserts the resulting `bpy.data` objects — catching "what Blender actually accepts"
  at build time rather than at demo time.
- The relay has its own in-process WebSocket tests (`cd relay && npm test`).

---

## Roadmap

- [x] Structured scene state engine
- [x] Real-time browser 3D preview
- [x] State-aware AI scene agent (Groq)
- [x] Deterministic Blender synchronization
- [x] Expanded scene vocabulary + free composition
- [x] Direct manipulation (selection + gizmo + numeric transforms)
- [x] Pre-sync verification & self-correction (+ optional AI vision)
- [ ] Voice input (speech → scene agent)
- [ ] Reference-image guidance (mood / lighting / palette)

---

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.

---

<div align="center">

Built with [Kiro](https://kiro.dev) · Powered by [Groq](https://groq.com), [Three.js](https://threejs.org), and [Blender](https://blender.org)

</div>
