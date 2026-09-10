"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Group } from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, PerspectiveCamera, TransformControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useThree } from "@react-three/fiber";
import { useSceneStore } from "@/store/sceneStore";
import { SceneObjectView } from "./SceneObjectView";
import { Lights } from "./Lights";
import { readTransform } from "./transformCommit";
import { registerCanvas } from "./canvasCapture";

/** Registers the WebGL canvas element so VerifyPanel can snapshot it (vision tier). */
function CanvasRegistrar() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    registerCanvas(gl.domElement);
    return () => registerCanvas(null);
  }, [gl]);
  return null;
}

export type GizmoMode = "translate" | "rotate" | "scale";

/**
 * SceneCanvas — renders the scene and hosts direct manipulation:
 *  - click an object to select it; click empty space to deselect,
 *  - a TransformControls gizmo attaches to the selected object,
 *  - the camera orbit is disabled while a gizmo handle is being dragged,
 *  - on drag-end the new transform is committed to the store via updateObject.
 *
 * All manipulation happens in the browser's Y-up scene space (canonical); the Blender
 * Y-up->Z-up conversion happens later at sync time in the compiler.
 */
export function SceneCanvas({ gizmoMode = "translate" }: { gizmoMode?: GizmoMode }) {
  const objects = useSceneStore((s) => s.scene.objects);
  const lights = useSceneStore((s) => s.scene.lights);
  const camera = useSceneStore((s) => s.scene.camera);
  const environment = useSceneStore((s) => s.scene.environment);
  const selectedId = useSceneStore((s) => s.selectedId);
  const select = useSceneStore((s) => s.select);
  const deselect = useSceneStore((s) => s.deselect);
  const updateObject = useSceneStore((s) => s.updateObject);

  const orbitRef = useRef<OrbitControlsImpl | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // Register the selected object's group so the gizmo can attach to it.
  const handleSelectedRef = useCallback((group: Group | null) => {
    setSelectedGroup(group);
  }, []);

  // If nothing is selected, drop the gizmo target.
  useEffect(() => {
    if (!selectedId) setSelectedGroup(null);
  }, [selectedId]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true }}
      onPointerMissed={() => deselect()}
    >
      <CanvasRegistrar />
      <color attach="background" args={[environment.backgroundColor]} />

      <PerspectiveCamera makeDefault position={camera.position} fov={camera.fov} />
      <OrbitControls ref={orbitRef} target={camera.target} enableDamping makeDefault />

      <Lights lights={lights} ambientIntensity={environment.ambientIntensity} />

      <Grid
        args={[40, 40]}
        cellColor="#20242e"
        sectionColor="#2c3240"
        infiniteGrid
        fadeDistance={40}
        position={[0, 0, 0]}
      />

      {objects.map((object) => (
        <SceneObjectView
          key={object.id}
          object={object}
          selected={object.id === selectedId}
          onSelect={select}
          onSelectedRef={handleSelectedRef}
        />
      ))}

      {selectedId && selectedGroup && (
        <TransformControls
          object={selectedGroup}
          mode={gizmoMode}
          onMouseDown={() => {
            if (orbitRef.current) orbitRef.current.enabled = false;
          }}
          onMouseUp={() => {
            if (orbitRef.current) orbitRef.current.enabled = true;
            // Commit the manipulated transform back to the store.
            updateObject(selectedId, readTransform(selectedGroup));
          }}
        />
      )}
    </Canvas>
  );
}
