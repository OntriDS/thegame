import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  safelist: [
    // Role Colors - Special Roles
    'border-purple-600', 'bg-purple-600', 'text-white', 'hover:bg-purple-700', 'dark:bg-purple-500', 'dark:hover:bg-purple-600',
    'border-primary', 'bg-primary', 'hover:bg-primary/90', 'dark:bg-primary', 'dark:hover:bg-primary/90',
    'border-green-600', 'bg-green-600', 'text-white', 'hover:bg-green-700', 'dark:bg-green-500', 'dark:hover:bg-green-600',
    'border-yellow-500', 'bg-yellow-500', 'text-white', 'hover:bg-yellow-900', 'dark:bg-yellow-800', 'dark:hover:bg-yellow-600',
    'border-teal-500', 'bg-teal-500', 'text-white', 'hover:bg-teal-700', 'dark:bg-teal-800', 'dark:hover:bg-teal-600',
    'border-pink-500', 'bg-pink-500', 'text-white', 'hover:bg-pink-700', 'dark:bg-pink-800', 'dark:hover:bg-pink-600',
    'border-stone-500', 'bg-stone-500', 'text-white', 'hover:bg-stone-700', 'dark:bg-stone-800', 'dark:hover:bg-stone-600',
    // Role Colors - Regular Roles
    'border-gray-400', 'bg-gray-100', 'text-white', 'dark:bg-gray-700', 'dark:text-white',
    'border-gray-200', 'dark:text-white', 'cursor-not-allowed',
    // Status Colors - Task
    'border-orange-500', 'bg-orange-100', 'text-orange-800',
    'border-gray-500', 'bg-gray-100', 'text-gray-800',
    'border-blue-500', 'bg-blue-100', 'text-blue-800',
    'border-purple-500', 'bg-purple-100', 'text-purple-800',
    'border-green-500', 'bg-green-100', 'text-green-800',
    'border-yellow-500', 'bg-yellow-100', 'text-yellow-800',
    'border-red-500', 'bg-red-100', 'text-red-800',
    // Status Colors - Item
    'border-orange-500', 'bg-orange-100', 'text-orange-800',
    'border-blue-500', 'bg-blue-100', 'text-blue-800',
    'border-green-500', 'bg-green-100', 'text-green-800',
    'border-yellow-500', 'bg-yellow-100', 'text-yellow-800',
    'border-purple-500', 'bg-purple-100', 'text-purple-800',
    'border-red-500', 'bg-red-100', 'text-red-800',
    // Points Colors
    'border-orange-800', 'text-orange-800', 'dark:text-white',
    'border-blue-800', 'text-blue-800', 'dark:text-white',
    'border-purple-800', 'text-purple-800', 'dark:text-white',
    'border-green-800', 'text-green-800', 'dark:text-white',
    'border-yellow-800', 'text-yellow-800', 'dark:text-white',
    'border-gray-800', 'text-gray-800', 'dark:text-white',
    // Financial Colors
    'text-red-800', 'text-green-800', 'text-gray-800', 'text-white', 'text-black',
  ],
  theme: {
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
