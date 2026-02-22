// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Make sure this matches your project structure
  ],
  theme: {
    extend: {
      fontSize: {
        tiny: '10px',
        xs: '11px',
        sm: '12px',
        base: '13px',
      },
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
      },
    },
  },
  plugins: [],
};
