# AI 3D Scene Prototyper for Blender
## Product Blueprint — Build With Kiro 2026

> **Status:** Product direction locked  
> **Document type:** Pre-Kiro product blueprint  
> **Purpose:** Establish the product, scope, architecture direction, MVP, and staged build plan before creating the official Kiro specs.

---

# 1. Executive Summary

We are building a **multimodal AI 3D scene prototyping workspace for Blender**.

The product allows a user to describe a 3D world in natural language, see an immediate browser-based preview, iteratively modify the existing world through natural-language instructions, and finally synchronize the structured scene into Blender.

The central product idea is not simply:

**Prompt → Generate 3D**

Instead, it is:

**Intent → Structured World State → Preview → Iterative Modification → Blender → Verification**

The system maintains a persistent, machine-readable representation of the current 3D world. The AI reasons over that existing state when the user asks for changes.

This allows the user to say:

- “Create a desk.”
- “Add a chair.”
- “Move the chair closer to the desk.”
- “Make the desk wider.”
- “Make everything darker.”
- “Add warm lighting.”
- “Remove the lamp.”

The AI therefore acts as a **state-aware 3D scene agent**, rather than a one-shot prompt-to-code generator.

Blender remains the final 3D authoring environment. The web application is the rapid ideation and prototyping layer.

---

# 2. Product Definition

## 2.1 Product

**Working name:** AI 3D Scene Prototyper for Blender

**Category:** AI-powered 3D creation / prototyping workspace

**Primary platform:** Web application connected to Blender

**Primary interaction:** Natural-language scene creation and editing

**Final authoring environment:** Blender

---

## 2.2 Product Vision

Make early-stage 3D creation feel as easy and iterative as having a conversation.

Instead of forcing users to manually construct a scene before they can evaluate an idea, allow them to rapidly describe, visualize, and refine that idea before committing it to Blender.

### Vision statement

> **Anyone should be able to prototype a 3D idea by describing it, seeing it, and continuously talking to it.**

---

# 3. The Problem

Creating even a simple 3D scene requires many manual interactions.

A user may need to:

1. Create objects.
2. Position objects.
3. Scale objects.
4. Rotate objects.
5. Assign materials.
6. Configure lighting.
7. Configure the camera.
8. Inspect the scene.
9. Decide what needs changing.
10. Repeat the process.

This creates a high interaction cost during the **ideation and blockout stage**.

The problem becomes particularly noticeable when the user is not yet sure what the final scene should look like.

For example, a designer may have an idea such as:

> “I want a cozy cyberpunk workstation.”

The difficult part is not necessarily producing the final professional 3D asset. The difficult part is rapidly getting from an idea to a visual prototype and then iterating on that prototype.

Our product focuses specifically on this gap.

---

# 4. Target Users

## Primary Users

### 1. Blender artists and 3D creators

Users who already use Blender and want to accelerate scene blocking, ideation, and repetitive scene modifications.

### 2. Designers and visual creators

People who need to explore 3D concepts without manually constructing every component before evaluating the idea.

### 3. Students and beginners

Users learning 3D who can describe what they want without initially knowing every Blender operation required to build it.

---

# 5. Core User Problem

> **“I have a 3D idea, but turning that idea into a visual scene and repeatedly modifying it takes too many manual steps.”**

The product solves this by allowing the user to communicate intent naturally while the system maintains the structured world underneath.

---

# 6. Product Promise

### Main promise

> **Describe a 3D world. See it instantly. Keep refining it with AI. Then take it into Blender.**

### Short product loop

**Describe → Preview → Refine → Sync → Verify**

---

# 7. Product Principles

These principles should guide every implementation decision.

## 7.1 AI must understand the current world

The AI should not treat every prompt as an independent generation request.

It should understand the existing scene state.

---

## 7.2 Structured state is the source of truth

The application's structured scene representation is the canonical representation of the current world.

The browser preview and Blender scene are derived from that state.

---

## 7.3 Deterministic execution

The LLM should not directly control Blender through arbitrary Python whenever possible.

Instead:

**AI output → validated scene state → deterministic compiler/runtime → Blender**

This reduces unpredictable execution and makes the system easier to debug.

---

## 7.4 Preview before commitment

The browser should provide a fast visual feedback loop.

The user should be able to make several changes before synchronizing with Blender.

---

## 7.5 Blender is not replaced

The product is an AI prototyping layer that works with Blender.

It is not intended to reproduce Blender's complete feature set.

---

## 7.6 Scope beats feature count

A small, polished, reliable workflow is more valuable for the hackathon than a large collection of partially working features.

---

# 8. Core Product Experience

The main experience is:

## Step 1 — Describe

The user enters:

> “Create a small cyberpunk workstation with a desk, chair, two monitors, a PC, and neon lighting.”

---

## Step 2 — Generate

The AI converts the request into a structured world representation.

Example:

```text
Scene
├── Desk
├── Chair
├── Monitor_01
├── Monitor_02
├── PC
├── Neon_Light
└── Environment
```

---

## Step 3 — Preview

The structured representation is rendered in the browser using a Three.js / React Three Fiber preview.

---

## Step 4 — Refine

The user continues interacting:

> “Make the desk wider.”

The AI identifies the desk and modifies its dimensions.

Then:

> “Move the chair closer.”

The AI modifies the chair's position relative to the desk.

Then:

> “Make the lighting more purple.”

The AI updates the environment/light state.

---

## Step 5 — Sync

The user clicks:

**Sync to Blender**

The deterministic compiler converts the structured state into Blender objects.

---

## Step 6 — Verify

The system confirms that the Blender scene was successfully created.

Advanced verification can later compare the resulting Blender render/viewport against the intended structured state.

---

# 9. The Fundamental Abstraction: A Structured 3D World

We should think of the product as maintaining a **world**, not merely generating isolated scenes.

A world may contain one object or many.

Example:

```text
World
│
├── Objects
│   ├── Desk
│   ├── Chair
│   ├── Monitor
│   └── PC
│
├── Materials
│
├── Lights
│
├── Camera
│
└── Environment
```

This means the same architecture supports:

### One object

> “Create a red cube.”

### Several objects

> “Create a desk and a chair.”

### A complete scene

> “Create a cyberpunk bedroom.”

The scene is therefore the **collection of structured entities and their relationships**.

---

# 10. MVP Scope

The MVP must be achievable before the hackathon deadline.

## 10.1 Scene Creation

The system must support:

- Text prompt input.
- AI interpretation of the prompt.
- Structured scene generation.
- Multiple objects in one scene.
- Object transforms.
- Basic materials.
- Basic lighting.
- Basic environment.
- Basic camera.

---

## 10.2 Supported Geometry

For the first implementation, prioritize a reliable set of primitive/object types.

### Core primitives

- Cube
- Sphere
- Cylinder
- Plane

### Composed objects

Objects can be represented as combinations of primitives.

For example:

```text
Chair
├── Seat
├── Back
├── Leg_01
├── Leg_02
├── Leg_03
└── Leg_04
```

This gives us more visual richness without requiring arbitrary mesh generation.

### Important constraint

The MVP does **not** attempt arbitrary AI-generated topology.

The objective is rapid scene prototyping, not professional asset sculpting.

---

# 11. MVP Scene State

The structured scene state should conceptually contain:

```text
Scene
├── metadata
├── objects[]
│   ├── id
│   ├── type
│   ├── name
│   ├── transform
│   ├── dimensions
│   ├── material
│   └── parent/relationship
├── lights[]
├── camera
└── environment
```

Every object should have a stable identifier.

Example:

```json
{
  "id": "chair_01",
  "type": "chair",
  "position": [1.2, 0, 0],
  "rotation": [0, 0, 0],
  "scale": [1, 1, 1]
}
```

The exact final schema will be determined during the Kiro design phase.

---

# 12. Scene Editing

The MVP should support natural-language modifications such as:

### Creation

- “Add a table.”
- “Add another monitor.”

### Deletion

- “Remove the lamp.”
- “Delete the second monitor.”

### Transformation

- “Move the chair left.”
- “Make the desk wider.”
- “Rotate the monitor.”

### Appearance

- “Make the chair red.”
- “Use a metallic material.”
- “Make the room darker.”

### Environment

- “Add warm lighting.”
- “Make the environment darker.”
- “Add a blue point light.”

---

# 13. AI Responsibilities

The AI is the core reasoning layer.

It should:

1. Understand the user's natural-language intent.
2. Understand the current structured world.
3. Determine whether the request creates, modifies, or deletes entities.
4. Resolve references such as “the chair” or “the second monitor.”
5. Produce a structured state change.
6. Preserve unaffected parts of the world.
7. Respect the supported schema.
8. Return predictable machine-readable output.

The AI should **not** be responsible for directly executing arbitrary Blender operations.

---

# 14. AI Interaction Model

Conceptually:

```text
Current World State
        +
User Intent
        ↓
     Scene Agent
        ↓
Validated State Change
        ↓
Updated World State
```

This can be represented as:

```text
State(t+1) = Agent(State(t), UserInput)
```

The system should prefer incremental updates over regenerating the entire world.

---

# 15. Browser Preview

The browser preview is responsible for rapid feedback.

### Proposed technology

- React
- React Three Fiber
- Three.js

The preview should:

- Render the current structured state.
- Update after AI changes.
- Support camera orbit/inspection.
- Visually represent materials.
- Display lighting/environment.
- Show loading/error states.

The browser preview does not need to match Blender's renderer perfectly.

Its purpose is:

> **Fast iteration and visual confirmation.**

---

# 16. Blender Integration

Blender is the final execution environment.

## Proposed flow

```text
Structured World State
        ↓
Validation
        ↓
Deterministic Compiler
        ↓
Blender Runtime
        ↓
Actual Blender Scene
```

The compiler should translate supported state entities into Blender objects.

Example:

```text
JSON Cube
   ↓
Compiler
   ↓
Blender cube
```

---

# 17. Blender Runtime

A local Blender integration layer will receive scene synchronization commands.

A possible architecture:

```text
Web Application
      ↓
Local Bridge
      ↓
Blender Runtime
      ↓
bpy
```

The Blender-side runtime should:

- Receive structured commands.
- Validate commands.
- Create/update/delete objects.
- Configure materials.
- Configure lights.
- Configure camera.
- Report success/failure.
- Avoid unnecessary blocking operations.

A local HTTP bridge is one possible implementation, but the exact mechanism should be validated during the design stage.

---

# 18. Verification

Verification is a major stretch feature.

### MVP verification

At minimum:

- Blender reports whether synchronization succeeded.
- Runtime returns useful errors.
- Application shows sync status.

### Advanced verification

After Blender generates the scene:

```text
Blender
   ↓
Viewport/Render Capture
   ↓
Vision Model
   ↓
Compare Against Intent/State
   ↓
Pass
or
Correction
```

Possible correction loop:

```text
Generate
   ↓
Execute
   ↓
Inspect
   ↓
Detect mismatch
   ↓
Patch State
   ↓
Execute Again
```

This creates a true closed-loop AI system.

---

# 19. Multimodal Roadmap

Text is the MVP input modality.

After the text workflow is stable:

## Voice

User says:

> “Move the chair closer to the desk.”

Pipeline:

```text
Voice
 ↓
Speech-to-Text
 ↓
Scene Agent
 ↓
State Update
```

## Reference Image

User uploads an image and says:

> “Use this image as inspiration for the lighting.”

The AI interprets visual characteristics and modifies the scene.

### Important scope decision

Image-to-complete-3D reconstruction is **not** part of the MVP.

It is substantially more complex than image-based style/reference guidance.

---

# 20. Out of Scope

The following are explicitly excluded from the initial build:

- Character generation
- Rigging
- Animation
- Physics
- Sculpting
- Arbitrary mesh generation
- Professional topology generation
- Full Blender replacement
- Complex procedural modeling
- Large asset marketplace
- Photorealistic rendering
- Full Blender modifier coverage
- Accurate image-to-3D reconstruction
- Complex simulation
- Large-scale collaborative editing

These can only be reconsidered after the MVP is stable.

---

# 21. Recommended Technical Architecture

High-level architecture:

```text
┌──────────────────────────────────────────────┐
│                  Web Client                  │
│                                              │
│  Prompt Input     Scene UI     3D Preview   │
│                         │          │         │
└─────────────────────────┼──────────┼────────┘
                          │
                          ▼
                ┌───────────────────┐
                │    Scene Agent    │
                │                   │
                │ Intent Reasoning  │
                │ State Reasoning   │
                │ Structured Output │
                └─────────┬─────────┘
                          │
                          ▼
                ┌───────────────────┐
                │  Scene State      │
                │   JSON / Schema   │
                └──────┬─────┬──────┘
                       │     │
              ┌────────┘     └────────┐
              ▼                       ▼
      ┌────────────────┐      ┌────────────────┐
      │ Web Renderer   │      │ State Compiler │
      │ Three.js/R3F   │      │                │
      └────────────────┘      └───────┬────────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │ Blender Bridge│
                              └───────┬───────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │    Blender    │
                              │     bpy      │
                              └───────────────┘
```

---

# 22. Why One Scene Agent for MVP

The original concept can be implemented using separate router and code-generation LLMs.

However, for the hackathon MVP, a single **Scene Agent** is preferable.

### Instead of:

```text
Router LLM
   ↓
State
   ↓
Code Generation LLM
   ↓
Blender
```

Use:

```text
Scene Agent
   ↓
Validated State
   ↓
Deterministic Compiler
   ↓
Blender
```

Benefits:

- Less complexity.
- Fewer AI calls.
- Lower latency.
- Lower cost.
- Easier debugging.
- Easier Kiro implementation.
- Less opportunity for state drift.
- Clearer product architecture.

A more complex multi-agent architecture can be introduced later if it provides measurable value.

---

# 23. Data Flow

## New scene

```text
User Prompt
   ↓
Scene Agent
   ↓
Structured Scene
   ↓
Validation
   ↓
Persistent State
   ↓
Browser Preview
```

## Scene modification

```text
Existing State
      +
User Prompt
      ↓
Scene Agent
      ↓
State Patch / Updated State
      ↓
Validation
      ↓
Persistent State
      ↓
Browser Preview
```

## Blender synchronization

```text
Persistent State
      ↓
Validation
      ↓
Deterministic Compiler
      ↓
Blender Bridge
      ↓
Blender
      ↓
Sync Result
```

---

# 24. Reliability Strategy

The biggest technical risk is not rendering primitives.

It is **keeping AI, browser preview, and Blender consistent**.

Therefore:

### Source of truth

Structured scene state.

### Browser

Derived representation.

### Blender

Derived execution environment.

### AI

Modifier of state.

This gives us:

```text
             ┌─────────────┐
             │ Scene State │
             └──────┬──────┘
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
   Browser Preview         Blender
```

The system should never treat the browser's visual state as the canonical state.

---

# 25. Error Handling

The system should handle:

### Invalid AI output

→ Reject and retry/repair.

### Unsupported object type

→ Return a controlled limitation instead of generating invalid Blender code.

### Ambiguous instruction

Example:

> “Move it over there.”

→ Ask the user for clarification when the reference cannot be resolved reliably.

### Blender unavailable

→ Show connection status and keep the browser scene available.

### Blender execution failure

→ Return an understandable error and preserve the structured state.

---

# 26. Security / Execution Principle

Arbitrary LLM-generated Blender Python should not be the default execution path.

Instead:

```text
LLM
 ↓
Structured State
 ↓
Validation
 ↓
Known Compiler Operations
 ↓
Blender
```

This makes execution more predictable and limits the AI to supported operations.

---

# 27. UX Structure

A simple initial interface:

```text
┌──────────────────────────────────────────────────────┐
│  AI 3D Scene Prototyper                              │
├──────────────────────────────────────────────────────┤
│                                                      │
│                 3D PREVIEW                           │
│                                                      │
│                                                      │
│                                                      │
├──────────────────────────────────────────────────────┤
│ Scene / Objects              AI COMMAND              │
│                                                      │
│ Desk                         "Make desk wider..."    │
│ Chair                         [ Send ]               │
│ Monitor                                               │
│ PC                            [ Sync to Blender ]    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

The UI should remain focused on the core workflow rather than becoming a complicated 3D editor.

---

# 28. Demo Scenario

The demo should tell one clear story.

## Scene

**Cyberpunk workstation**

### Step 1

User:

> “Create a compact cyberpunk workstation with a desk, chair, two monitors, a PC and neon lighting.”

Scene appears.

### Step 2

User:

> “Make the desk wider and move the chair closer.”

Scene updates.

### Step 3

User:

> “Make the lighting purple and add a neon strip behind the monitors.”

Scene updates.

### Step 4

User:

> “Remove the second monitor.”

Scene updates.

### Step 5

User clicks:

**Sync to Blender**

### Step 6

Blender creates the scene.

### Step 7

Show the Blender result.

### Optional final step

Run verification and demonstrate that the generated Blender scene matches the requested structure.

---

# 29. Building Stages

The project should be built in staged milestones.

The stages below are intentionally ordered so that every stage produces a usable foundation for the next one.

---

## STAGE 0 — Product and Kiro Foundation

### Goal

Lock the product direction and establish the repository/Kiro workflow before substantial implementation.

### Deliverables

- Product blueprint finalized.
- Git repository initialized.
- Project structure established.
- Kiro project opened.
- Initial Kiro feature spec created.
- Requirements reviewed.
- Design reviewed.
- Tasks generated.
- Initial commit created within the allowed hackathon window.

### Exit criteria

We have a clear product definition and a Kiro-generated implementation plan.

---

# STAGE 1 — Application Skeleton

### Goal

Create the basic web application and establish the development foundation.

### Work

- Create frontend.
- Establish styling system.
- Establish component structure.
- Create main workspace layout.
- Add prompt input.
- Add scene preview container.
- Add object/state panel.
- Add basic application state management.
- Add loading/error states.

### Exit criteria

The user can open the application and see the complete workspace layout.

No AI or Blender integration is required yet.

---

# STAGE 2 — Scene State Engine

### Goal

Build the canonical structured world representation.

### Work

- Define scene schema.
- Define object schema.
- Define transforms.
- Define materials.
- Define lights.
- Define camera.
- Define environment.
- Create stable object IDs.
- Implement state validation.
- Implement state updates.
- Implement object add/remove/update operations.
- Implement serialization.

### Exit criteria

A complete scene can be represented and modified without any AI.

This stage is critical because it becomes the foundation for every later stage.

---

# STAGE 3 — Browser 3D Preview

### Goal

Render the structured state as a real-time 3D scene.

### Work

- Integrate Three.js / React Three Fiber.
- Render supported primitives.
- Apply transforms.
- Apply materials.
- Render lights.
- Configure camera.
- Render environment.
- Connect renderer to scene state.
- Implement updates when state changes.

### Exit criteria

Changing the JSON/state visibly changes the browser scene.

---

# STAGE 4 — AI Scene Agent

### Goal

Make natural language capable of creating and modifying the structured world.

### Work

- Connect the chosen AI model.
- Define system instructions.
- Provide current scene state to the model.
- Define structured output format.
- Implement creation requests.
- Implement modification requests.
- Implement deletion requests.
- Implement transform requests.
- Implement material requests.
- Implement environment requests.
- Validate model output.
- Reject unsupported operations.
- Apply valid changes to scene state.

### Exit criteria

The user can create a scene through natural language and then modify it without manually editing JSON.

---

# STAGE 5 — State-Aware Iterative Editing

### Goal

Prove the core differentiator.

### Work

Test conversations such as:

```text
Create a desk.
↓
Add a chair.
↓
Move the chair closer.
↓
Make the desk wider.
↓
Add a monitor.
↓
Make the monitor larger.
↓
Change the lighting.
```

The system must preserve existing objects and modify only what the user requests.

### Exit criteria

The system reliably maintains context across multiple sequential commands.

This is one of the most important MVP milestones.

---

# STAGE 6 — Blender Compiler

### Goal

Convert structured state into deterministic Blender operations.

### Work

- Design compiler architecture.
- Map object types to Blender objects.
- Map transforms.
- Map dimensions.
- Map materials.
- Map lights.
- Map camera.
- Map environment.
- Handle object IDs.
- Implement create/update/delete operations.
- Implement scene reset/synchronization behavior.
- Return structured execution results.

### Exit criteria

A structured scene created in the web application can be reproduced in Blender.

---

# STAGE 7 — Blender Bridge

### Goal

Connect the web application to a running Blender instance.

### Work

- Build Blender-side runtime.
- Implement communication protocol.
- Establish local connection.
- Implement command queue if needed.
- Implement synchronization endpoint.
- Implement success/error responses.
- Handle Blender unavailable state.
- Test repeated synchronization.

### Exit criteria

The user can click:

**Sync to Blender**

and see the corresponding scene appear in Blender.

---

# STAGE 8 — End-to-End MVP

### Goal

Connect every core component.

### Final flow

```text
Prompt
 ↓
AI
 ↓
Scene State
 ↓
Browser Preview
 ↓
Iterative Editing
 ↓
Sync
 ↓
Compiler
 ↓
Blender
```

### Work

- Connect all components.
- Remove prototype-only code.
- Handle loading.
- Handle failures.
- Improve state synchronization.
- Improve UX.
- Test full workflow repeatedly.

### Exit criteria

The entire cyberpunk workstation demo works from beginning to end.

---

# STAGE 9 — Reliability and Polish

### Goal

Turn the functional prototype into a convincing hackathon product.

### Work

- Improve AI prompts.
- Improve structured output reliability.
- Add validation.
- Add friendly errors.
- Improve loading indicators.
- Improve scene transition behavior.
- Improve UI.
- Improve visual hierarchy.
- Add empty states.
- Add sync status.
- Add connection status.
- Test edge cases.

### Exit criteria

A new user can understand the product without developer explanation.

---

# STAGE 10 — Voice Input

### Goal

Add voice as the first multimodal extension.

### Work

```text
Voice
 ↓
Speech-to-Text
 ↓
Scene Agent
 ↓
State Update
```

### Example

> “Make the chair a little closer to the desk.”

### Exit criteria

Voice can reliably perform the same supported operations as text.

### Priority

**Stretch feature.**

Do not start this until the text workflow is stable.

---

# STAGE 11 — Reference Image Understanding

### Goal

Allow users to provide visual inspiration.

### Example

User uploads an image and says:

> “Use this as inspiration for the lighting and mood.”

### Work

- Image upload.
- Vision-capable AI input.
- Extract relevant visual characteristics.
- Translate characteristics into supported scene changes.
- Apply changes to structured state.

### Exit criteria

The system can use an image as reference without attempting full image-to-3D reconstruction.

### Priority

**Stretch feature.**

---

# STAGE 12 — Visual Verification

### Goal

Close the AI loop by checking what Blender actually produced.

### Work

```text
Scene State
 ↓
Blender
 ↓
Render / Viewport Capture
 ↓
Vision Model
 ↓
Verification
```

Verification can check:

- Required objects exist.
- Major transforms are plausible.
- Lighting is present.
- Scene is visually consistent with intent.
- Blender did not fail silently.

### Exit criteria

The system can report whether the generated Blender result appears consistent with the requested scene.

### Priority

**High-value stretch feature.**

This should be attempted only after the entire MVP is stable.

---

# STAGE 13 — Self-Correction

### Goal

Enable automatic correction after verification.

### Work

```text
Generate
 ↓
Execute
 ↓
Inspect
 ↓
Detect Issue
 ↓
Generate Patch
 ↓
Execute
 ↓
Verify
```

### Example

If the user requested two monitors but only one exists:

```text
Verification:
Expected 2 monitors.
Detected 1.
 ↓
Patch state.
 ↓
Create missing monitor.
```

### Priority

**Final stretch feature.**

This is potentially the strongest technical demonstration, but it must never be allowed to jeopardize the MVP.

---

# 30. Priority System

Every feature should be categorized into one of three groups.

## P0 — Must Have

- Scene state
- Text input
- AI scene agent
- Primitive/composed-object creation
- Iterative editing
- Browser preview
- Materials
- Basic lighting
- Camera
- Deterministic Blender compiler
- Blender bridge
- End-to-end synchronization
- Polished core UI

## P1 — High Value Stretch

- Voice
- Reference images
- Verification
- Better object composition
- State diff visualization

## P2 — Future

- Self-healing loop
- Advanced mesh generation
- Characters
- Animation
- Rigging
- Complex procedural geometry
- Full Blender feature support

---

# 31. What Success Looks Like

The MVP is successful if a user can:

1. Open the web application.
2. Describe a 3D scene.
3. See the scene appear.
4. Ask for several sequential modifications.
5. See those modifications happen without losing previous state.
6. Click Sync to Blender.
7. See the scene recreated in Blender.
8. Understand the value without technical explanation.

---

# 32. Hackathon Demo Strategy

The demo should emphasize the **product behavior**, not the amount of code.

The strongest narrative is:

### Problem

3D scene ideation and repetitive modification are slow.

### Solution

Talk to a persistent structured 3D world.

### Demonstration

```text
Describe
   ↓
Generate
   ↓
Modify
   ↓
Modify again
   ↓
Modify again
   ↓
Sync
   ↓
Blender
```

### Technical reveal

Briefly show:

```text
Natural Language
       ↓
Scene Agent
       ↓
Structured State
       ↓
Deterministic Compiler
       ↓
Blender
```

If verification is implemented, finish with:

```text
Blender
   ↓
Vision Verification
   ↓
Pass / Correct
```

---

# 33. Product Positioning

Avoid positioning the product as:

> “An AI that replaces Blender.”

Avoid:

> “AI that generates any 3D model.”

Avoid:

> “A complete AI 3D modeling platform.”

Prefer:

> **“An AI-powered rapid prototyping layer for Blender.”**

Or:

> **“A conversational workspace for building and iterating on structured 3D worlds before taking them into Blender.”**

---

# 34. Differentiation

Our strongest differentiation is not merely AI generation.

It is the combination of:

### 1. Persistent world state

The AI understands what already exists.

### 2. Conversational editing

Users can continuously modify the same world.

### 3. Fast visual feedback

Changes appear immediately in the browser.

### 4. Deterministic Blender execution

The AI produces structured intent rather than uncontrolled Blender code.

### 5. Verification

The long-term architecture allows the system to inspect what Blender actually produced.

Together:

> **AI understands the world → modifies the world → previews the world → sends it to Blender → can verify the result.**

---

# 35. Technical Risks and Mitigations

## Risk 1 — AI state drift

### Problem

The AI forgets objects or misunderstands references.

### Mitigation

Persistent structured state, stable IDs, explicit schema, state validation.

---

## Risk 2 — Browser/Blender divergence

### Problem

The preview looks different from Blender.

### Mitigation

Both are derived from the same structured state.

---

## Risk 3 — LLM produces invalid output

### Problem

AI returns unsupported or malformed data.

### Mitigation

Structured output + schema validation + controlled retry/repair.

---

## Risk 4 — Blender connection fails

### Problem

The web application cannot reach Blender.

### Mitigation

Connection status, clear error messages, persistent browser state.

---

## Risk 5 — Scope explosion

### Problem

Too many advanced features consume development time.

### Mitigation

Strict P0/P1/P2 prioritization.

---

## Risk 6 — AI cost/latency

### Problem

Too many model calls make the product slow or expensive.

### Mitigation

Use one Scene Agent for MVP, incremental state changes, concise state representations where possible.

---

# 36. Definition of Done for MVP

The MVP is considered complete only when all of the following are true:

- [ ] User can create a scene with text.
- [ ] Scene is represented using structured state.
- [ ] Browser preview reflects the state.
- [ ] User can perform multiple sequential edits.
- [ ] Existing objects remain intact unless explicitly changed.
- [ ] Materials work.
- [ ] Basic lighting works.
- [ ] Camera works.
- [ ] State is validated.
- [ ] Blender compiler works.
- [ ] Blender bridge works.
- [ ] A scene can be synchronized into Blender.
- [ ] Errors are surfaced clearly.
- [ ] The primary demo scenario works repeatedly.
- [ ] The application is deployable.
- [ ] The repository contains the required Kiro specs.
- [ ] Git history demonstrates genuine spec-driven development.

The competition specifically requires the finalized Kiro requirements and tasks files, a public repository, and a live deployment, so these are part of the actual completion criteria—not optional documentation. 

---

# 37. Kiro Strategy

This blueprint is **not** intended to replace the official Kiro specification.

It exists to establish product direction before entering Kiro.

The official Kiro workflow should then produce:

```text
.kiro/
└── specs/
    └── <feature>/
        ├── requirements.md
        ├── design.md
        └── tasks.md
```

The Kiro requirements should turn this product definition into explicit user stories and acceptance criteria.

The Kiro design should turn the approved architecture into implementation decisions.

The Kiro tasks should break implementation into discrete, trackable work.

The implementation should then proceed task-by-task.

---

# 38. Recommended Kiro Feature Breakdown

Rather than creating one enormous specification for the entire application, use meaningful feature boundaries where appropriate.

Potential specifications:

### Spec 1 — Core Scene State

The structured 3D world representation.

### Spec 2 — Browser 3D Preview

Rendering the structured state.

### Spec 3 — AI Scene Agent

Natural-language creation and modification.

### Spec 4 — Blender Synchronization

Compiler and Blender bridge.

### Spec 5 — Voice Input

Stretch.

### Spec 6 — Reference Image Understanding

Stretch.

### Spec 7 — Visual Verification

Stretch.

The exact spec breakdown should be finalized inside Kiro based on its requirements/design/task workflow.

---

# 39. Final Product Definition

## What are we building?

A conversational AI workspace for rapidly creating and iteratively editing structured 3D worlds, with a browser-based real-time preview and deterministic synchronization into Blender.

## Who is it for?

Primarily Blender users, 3D artists, designers, and creators who want to accelerate 3D ideation and scene prototyping.

## What problem does it solve?

It reduces the manual interaction cost of turning an idea into a visual 3D prototype and repeatedly modifying that prototype.

## How does it solve the problem?

It maintains a persistent structured representation of the user's 3D world and uses AI to interpret natural-language instructions as controlled changes to that world.

## What makes it different?

The AI is state-aware. It does not simply generate isolated scenes or arbitrary Blender code. It continuously understands and modifies an existing structured world.

## What is the MVP?

Text-driven scene creation, state-aware iterative editing, browser 3D preview, and deterministic Blender synchronization.

## What is the long-term direction?

A genuinely multimodal, closed-loop 3D creation system where users can talk to, show references to, and continuously refine a 3D world, while AI can eventually inspect Blender's output and correct discrepancies.

---

# 40. North Star

The entire project should ultimately feel like this:

> **“I don't have to learn how to construct every 3D change before I can explore an idea. I can simply talk to my world.”**

That is the product we are building.
