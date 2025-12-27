/**
 * 时间格式化工具函数
 */

/**
 * 格式化日期时间字符串，显示年月日时分秒
 * @param dateString - ISO 格式的日期时间字符串（如 "2024-11-20T10:30:45" 或 "2024-11-20"）
 * @returns 格式化后的日期时间字符串，格式：YYYY-MM-DD HH:mm:ss
 */
export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) {
    return "";
  }

  try {
    // 如果已经是完整的 ISO 格式（包含 T）
    if (dateString.includes("T")) {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // 如果解析失败，返回原字符串
      }
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } else {
      // 如果只是日期格式（如 "2024-11-20"），添加默认时间 00:00:00
      return `${dateString} 00:00:00`;
    }
  } catch (error) {
    console.error("日期格式化失败:", error);
    return dateString; // 出错时返回原字符串
  }
}

/**
 * 格式化日期字符串，仅显示年月日（用于向后兼容）
 * @param dateString - ISO 格式的日期时间字符串
 * @returns 格式化后的日期字符串，格式：YYYY-MM-DD
 */
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) {
    return "";
  }

  try {
    if (dateString.includes("T")) {
      return dateString.split("T")[0];
    }
    return dateString;
  } catch (error) {
    console.error("日期格式化失败:", error);
    return dateString;
  }
}

/**
 * 格式化订单号，显示前6位和后6位，中间用...连接
 * @param orderNumber - 订单号字符串
 * @returns 格式化后的订单号，格式：前6位...后6位
 */
export function formatOrderNumber(orderNumber: string | undefined | null): string {
  if (!orderNumber) {
    return "";
  }

  // 如果订单号长度小于等于12，直接返回
  if (orderNumber.length <= 12) {
    return orderNumber;
  }

  // 显示前6位和后6位，中间用...连接
  const prefix = orderNumber.substring(0, 6);
  const suffix = orderNumber.substring(orderNumber.length - 6);
  return `${prefix}...${suffix}`;
}

