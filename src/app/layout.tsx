import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 3D Scene Prototyper for Blender",
  description:
    "Describe a 3D world, see it instantly, refine it with AI, then sync it into Blender.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
