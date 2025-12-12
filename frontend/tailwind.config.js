/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // We use CSS variables for theming
        background: "var(--bg-primary)",
        surface: "var(--bg-secondary)",
        text: "var(--text-primary)",
        primary: "var(--accent-primary)",
      }
    },
  },
  plugins: [],
}
