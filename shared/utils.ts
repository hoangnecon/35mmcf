import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format as formatFns } from 'date-fns';
import { vi } from 'date-fns/locale';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export const getVietnamCurrentIsoString = (): string => {
    const now = new Date(); // Lấy thời gian hiện tại của server (thường là UTC hoặc múi giờ của server)
    const zonedDate = toZonedTime(now, VN_TIME_ZONE); // Chuyển đổi sang đối tượng Date ở múi giờ VN
    return zonedDate.toISOString(); // Trả về chuỗi ISO (sẽ là UTC, nhưng tương ứng với giờ VN)
}

// Các hàm format ở frontend để luôn định dạng theo múi giờ Việt Nam
export function formatDateTime(dateString: Date | string): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const zonedDate = toZonedTime(date, VN_TIME_ZONE); // Chuyển đổi về múi giờ VN trước khi định dạng
  return formatFns(zonedDate, 'dd/MM/yyyy HH:mm:ss', { locale: vi });
}

export function formatDate(dateString: Date | string): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const zonedDate = toZonedTime(date, VN_TIME_ZONE);
  return formatFns(zonedDate, 'dd/MM/yyyy', { locale: vi });
}

export function formatTime(dateString: Date | string): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const zonedDate = toZonedTime(date, VN_TIME_ZONE);
  return formatFns(zonedDate, 'HH:mm:ss', { locale: vi });
}

export function calculateOrderTotal(orderItems: any[]): number {
  return orderItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
}

export function generateOrderNumber(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
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

// Helper function: Get UTC ISO string representing the start of the local selected day
export const getUtcIsoStringForLocalDayStart = (date: Date | undefined) => {
  if (!date) return undefined;
  // Tạo một Date object với thời gian 00:00:00 của ngày được chọn TẠI MÚI GIỜ CỤC BỘ CỦA MÁY CLIENT.
  // Sau đó chuyển nó sang múi giờ VN trước khi lấy ISO string (sẽ là UTC tương ứng).
  const localDayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const zonedDayStartInVN = toZonedTime(localDayStart, VN_TIME_ZONE);
  return zonedDayStartInVN.toISOString();
};

// Helper function: Lấy chuỗi ISO UTC đại diện cho bắt đầu ngày cục bộ TIẾP THEO
// Dùng cho endDate trong query range [startDate, endDate)
export const getUtcIsoStringForNextLocalDayStart = (date: Date | undefined) => {
  if (!date) return undefined;
  const nextLocalDayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  const zonedNextDayStartInVN = toZonedTime(nextLocalDayStart, VN_TIME_ZONE);
  return zonedNextDayStartInVN.toISOString();
}