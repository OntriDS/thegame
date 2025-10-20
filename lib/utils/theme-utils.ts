// lib/utils/theme-utils.ts
// Theme and color utility functions

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
} 

// Calculate readable text color based on background color luminance
export function getReadableTextColor(bgColor: string): string {
  // Extract HSL values from the color string
  const hslMatch = bgColor.match(/hsl\(([^)]+)\)/);
  if (!hslMatch) return 'text-white'; // fallback
  
  const hslValues = hslMatch[1].split(',').map(v => parseFloat(v.trim()));
  if (hslValues.length < 3) return 'text-white'; // fallback
  
  const [hue, saturation, lightness] = hslValues;
  
  // Convert HSL to RGB for luminance calculation
  const s = saturation / 100;
  const l = lightness / 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = l - c / 2;
  
  let r, g, b;
  if (hue < 60) { r = c; g = x; b = 0; }
  else if (hue < 120) { r = x; g = c; b = 0; }
  else if (hue < 180) { r = 0; g = c; b = x; }
  else if (hue < 240) { r = 0; g = x; b = c; }
  else if (hue < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  
  r = (r + m) * 255;
  g = (g + m) * 255;
  b = (b + m) * 255;
  
  // Calculate perceived luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? 'text-black' : 'text-white';
}
