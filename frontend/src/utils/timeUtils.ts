// 时间处理工具函数 - 统一使用北京时间 (UTC+8)

/**
 * 获取当前北京时间
 * @returns Date 对象（北京时间）
 */
export function getBeijingTime(): Date {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 8));
}

/**
 * 获取北京时间的 ISO 字符串（供后端存储使用）
 * @returns ISO 格式字符串（北京时间）
 */
export function getBeijingISOString(): string {
  return getBeijingTime().toISOString();
}

/**
 * 将 UTC/任意时区时间转换为北京时间并格式化显示
 * @param dateString ISO 日期字符串
 * @param includeTime 是否包含时间
 * @returns 格式化后的北京时间字符串
 */
export function formatToBeijingTime(dateString: string | Date, includeTime: boolean = true): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const beijing = new Date(utc + (3600000 * 8));
  
  const year = beijing.getFullYear();
  const month = String(beijing.getMonth() + 1).padStart(2, '0');
  const day = String(beijing.getDate()).padStart(2, '0');
  
  if (!includeTime) {
    return `${year}-${month}-${day}`;
  }
  
  const hours = String(beijing.getHours()).padStart(2, '0');
  const minutes = String(beijing.getMinutes()).padStart(2, '0');
  const seconds = String(beijing.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 仅获取日期部分（北京时间）
 * @param dateString ISO 日期字符串
 * @returns 日期字符串 YYYY-MM-DD
 */
export function formatBeijingDate(dateString: string | Date): string {
  return formatToBeijingTime(dateString, false);
}

/**
 * 获取当前日期字符串（北京时间）
 * @returns 当前日期 YYYY-MM-DD
 */
export function getTodayBeijing(): string {
  return formatBeijingDate(getBeijingTime());
}

/**
 * 获取几天前/后的日期（北京时间）
 * @param days 天数（负数表示几天前）
 * @returns 日期字符串 YYYY-MM-DD
 */
export function getBeijingDateOffset(days: number): string {
  const date = getBeijingTime();
  date.setDate(date.getDate() + days);
  return formatBeijingDate(date);
}
