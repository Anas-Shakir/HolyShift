"use client";

import type { Light } from "@/lib/scene/schema";

/**
 * Renders the scene's lights plus an ambient floor from the environment.
 * Maps each Light type to the corresponding Three.js light element.
 */
export function Lights({ lights, ambientIntensity }: { lights: Light[]; ambientIntensity: number }) {
  return (
    <>
      {/* ambient floor so the scene is never fully black */}
      <ambientLight intensity={ambientIntensity} />
      {/* a soft key light so primitives read even with no scene lights yet */}
      <directionalLight position={[5, 8, 5]} intensity={0.6} />

      {lights.map((light) => {
        switch (light.type) {
          case "point":
            return (
              <pointLight
                key={light.id}
                position={light.position}
                color={light.color}
                intensity={light.intensity}
              />
            );
          case "directional":
            return (
              <directionalLight
                key={light.id}
                position={light.position}
                color={light.color}
                intensity={light.intensity}
              />
            );
          case "spot":
            return (
              <spotLight
                key={light.id}
                position={light.position}
                color={light.color}
                intensity={light.intensity}
                angle={0.5}
                penumbra={0.4}
              />
            );
          case "ambient":
            return <ambientLight key={light.id} color={light.color} intensity={light.intensity} />;
          default:
            return null;
        }
      })}
    </>
  );
}
