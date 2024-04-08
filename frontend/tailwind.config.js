/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        carbonGray: {
          100: "#9D9D9D",
          600: "#413458",
          700: "#2d2d2d",
          800: "#262626",
          900: "#1c1c1c",
        },
      },
    },
    fontFamily: {
      ibm: ["IBM Plex Sans"],
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
}
