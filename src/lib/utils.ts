import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Original shadcn/ui utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export all our new utilities for easy importing
export * from './validations'
export * from './formatters'  
export * from './calculations'
