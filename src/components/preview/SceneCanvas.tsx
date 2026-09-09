"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, PerspectiveCamera } from "@react-three/drei";
import { useSceneStore } from "@/store/sceneStore";
import { SceneObjectView } from "./SceneObjectView";
import { Lights } from "./Lights";

/**
 * SceneCanvas — the R3F canvas that renders the current scene state.
 *
 * Reads camera / environment / lights / objects from the Zustand store. Because objects
 * are read via a selector and keyed by id, R3F reconciles adds/removes/changes live when
 * the state changes (JSON inspector now, AI agent in Spec 3).
 */
export function SceneCanvas() {
  const objects = useSceneStore((s) => s.scene.objects);
  const lights = useSceneStore((s) => s.scene.lights);
  const camera = useSceneStore((s) => s.scene.camera);
  const environment = useSceneStore((s) => s.scene.environment);

  return (
    <Canvas shadows dpr={[1, 2]}>
      <color attach="background" args={[environment.backgroundColor]} />

      <PerspectiveCamera makeDefault position={camera.position} fov={camera.fov} />
      <OrbitControls target={camera.target} enableDamping makeDefault />

      <Lights lights={lights} ambientIntensity={environment.ambientIntensity} />

      {/* ground reference grid */}
      <Grid
        args={[40, 40]}
        cellColor="#20242e"
        sectionColor="#2c3240"
        infiniteGrid
        fadeDistance={40}
        position={[0, 0, 0]}
      />

      {objects.map((object) => (
        <SceneObjectView key={object.id} object={object} />
      ))}
    </Canvas>
  );
}
