/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#FF5A1F", // Preserved brand identity reference
          foreground: "#FFFFFF",
          hover: "#E04810",
          light: "#FFF2EB",
        },
        secondary: {
          DEFAULT: "#FF7A45",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#F59E0B",
          foreground: "#0F172A",
        },
        success: {
          DEFAULT: "#059669",
          foreground: "#FFFFFF",
        },
        danger: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        warning: {
          DEFAULT: "#F59E0B",
          foreground: "#0F172A",
        },
        info: {
          DEFAULT: "#3B82F6",
          foreground: "#FFFFFF",
        },
        text: {
          DEFAULT: "#0F172A", // Deep Slate 900 for high-contrast, crisp typography
          secondary: "#475569", // Slate 600 for clear secondary text
          muted: "#64748B", // Slate 500 for captions
        },
        bg: {
          DEFAULT: "#F8FAFC", // Clean Slate 50 neutral canvas
          subtle: "#F1F5F9", // Slate 100 for section contrast
          pure: "#FFFFFF",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F172A",
        },
        border: {
          DEFAULT: "#E2E8F0", // Slate 200 crisp hairline border
          subtle: "#F1F5F9",
        }
      },
      borderRadius: {
        'card': '16px',
        'button': '12px',
        'input': '12px',
        'section': '24px',
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 8px 24px -4px rgba(15, 23, 42, 0.05)',
        'elevated': '0 12px 32px -8px rgba(15, 23, 42, 0.08)',
        'subtle': '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'sans-serif'],
        poppins: ['"Be Vietnam Pro"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
