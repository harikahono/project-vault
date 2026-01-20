import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const glitchVariants = {
  hover: {
    x: [0, -1, 1, 0],
    filter: ["hue-rotate(0deg)", "hue-rotate(90deg)", "hue-rotate(0deg)"],
    transition: { duration: 0.1, repeat: Infinity }
  }
};