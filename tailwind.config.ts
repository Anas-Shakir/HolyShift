import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        panel: "#14161c",
        "panel-alt": "#1b1e26",
        edge: "#272b36",
        accent: "#7c5cff",
      },
    },
  },
  plugins: [],
};

export default config;
