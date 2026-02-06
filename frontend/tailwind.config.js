/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "accent-red": "#E31E24",
        "accent-red-dark": "#C41A1F",
        "accent-red-light": "#FDE8E8",
        "bg-primary": "#F8F8F8",
        "bg-muted": "#F3F4F6",
        "bg-card": "#FFFFFF",
        "text-primary": "#1A1A1A",
        "text-secondary": "#757575",
        "text-tertiary": "#9CA3AF",
        "border-default": "#E5E5E5",
        "border-light": "#F3F4F6",
        "status-positive": "#00C853",
        "status-warning": "#FFA000",
        "status-negative": "#D32F2F",
      },
      fontFamily: {
        playfair: ["var(--font-playfair)"],
        inter: ["var(--font-inter)"],
      },
    },
  },
  plugins: [],
};
