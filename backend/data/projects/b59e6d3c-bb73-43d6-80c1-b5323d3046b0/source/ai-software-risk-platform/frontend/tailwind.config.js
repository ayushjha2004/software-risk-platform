/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0f1117",
          raised: "#161923",
          border: "#252a37",
        },
        brand: {
          DEFAULT: "#4f7cff",
          hover: "#3d63e0",
        },
        risk: {
          low: "#22c55e",
          medium: "#eab308",
          high: "#ef4444",
        },
      },
    },
  },
  plugins: [],
};
