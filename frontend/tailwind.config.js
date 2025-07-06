/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FACC15',     // retro gold
        accent: '#1E3A8A',      // dark navy blue
        background: '#F3F4F6',  // light gray
      },
    },
  },
  plugins: [],
};
