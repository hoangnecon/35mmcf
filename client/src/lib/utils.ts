// client/src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh', // Thêm múi giờ Việt Nam
  });
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh', // Thêm múi giờ Việt Nam
  });
}

export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh', // Thêm múi giờ Việt Nam
  });
}

export function calculateOrderTotal(orderItems: any[]): number {
  return orderItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
}

export function generateOrderNumber(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-<span class="math-inline">\{timestamp\}\-</span>{random}`;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Helper function: Get UTC ISO string representing the start of the local selected day in Vietnam timezone
export const getUtcIsoStringForLocalDayStart = (date: Date | undefined) => {
  if (!date) return undefined;

  // Convert the input date to a string in 'Asia/Ho_Chi_Minh' timezone
  // This handles cases where the local machine's timezone is not 'Asia/Ho_Chi_Minh'
  const vietnamDateString = new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false // Ensure 24-hour format
  });

  // Re-parse this string to get a Date object that is conceptually in Vietnam's timezone
  // For example, if vietnamDateString is "06/14/2025, 00:00:00", parsing it directly might still make it local.
  // The most reliable way is to construct a UTC date from the desired Vietnam date components.
  const parts = vietnamDateString.match(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/);
  if (!parts) return undefined;

  const year = parseInt(parts[3]);
  const month = parseInt(parts[1]) - 1; // Months are 0-indexed
  const day = parseInt(parts[2]);
  const hours = parseInt(parts[4]);
  const minutes = parseInt(parts[5]);
  const seconds = parseInt(parts[6]);

  // Create a new Date object representing the start of the day in Vietnam timezone
  // Then convert it to UTC. Vietnam is GMT+7.
  const dateInVietnamTime = new Date(Date.UTC(year, month, day, hours, minutes, seconds));

  // Adjust to the start of the day in Vietnam time (00:00:00) and then convert to UTC.
  // To get 00:00:00 of the selected day in Vietnam,
  // we set its hours, minutes, seconds, milliseconds to 0 locally.
  // Then toISOString() will convert it to UTC.
  // Example: if selected date is 'Fri Jun 14 2025 10:00:00 GMT+0700'
  // We want 'Fri Jun 14 2025 00:00:00 GMT+0700'
  // Then .toISOString() will give '2025-06-13T17:00:00.000Z'
  const localDayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return localDayStart.toISOString();
}