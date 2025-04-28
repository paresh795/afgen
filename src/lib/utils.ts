import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(price / 100)
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}
