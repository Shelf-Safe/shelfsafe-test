/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brandTeal: "#00808d",
        brandNavy: "#003a56",
        ink: "#111827",
        line: "#e5e7eb",
      },
    },
  },
  plugins: [],
};
