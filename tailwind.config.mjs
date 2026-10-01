/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0c",
        surface: "#111116",
        border: "#1f1f28",
        brand: "#3b82f6",
        long: "#10b981",
        short: "#f43f5e",
      },
    },
  },
  plugins: [],
};
