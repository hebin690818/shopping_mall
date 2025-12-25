import { API_BASE_URL_IMAGE } from "./config";

/**
 * 从逗号分隔的图片URL字符串中获取第一张图片
 * @param imageUrl 图片URL字符串（可能是逗号分隔的多张图片）
 * @returns 第一张图片的完整URL
 */
export const getFirstImageUrl = (imageUrl: string | undefined | null): string => {
  if (!imageUrl) return "";
  
  // 按逗号分割，取第一张
  const urls = imageUrl.split(",").map((url) => url.trim()).filter((url) => url);
  if (urls.length === 0) return "";
  
  const firstUrl = urls[0];
  // 如果已经是完整URL，直接返回；否则拼接API_BASE_URL_IMAGE
  return firstUrl.startsWith("http") ? firstUrl : `${API_BASE_URL_IMAGE}${firstUrl}`;
};

/**
 * 从逗号分隔的图片URL字符串中获取所有图片URL数组
 * @param imageUrl 图片URL字符串（可能是逗号分隔的多张图片）
 * @returns 所有图片的完整URL数组
 */
export const getAllImageUrls = (imageUrl: string | undefined | null): string[] => {
  if (!imageUrl) return [];
  
  // 按逗号分割，过滤空值
  const urls = imageUrl.split(",").map((url) => url.trim()).filter((url) => url);
  
  // 处理每个URL，如果是完整URL直接返回，否则拼接API_BASE_URL_IMAGE
  return urls.map((url) => 
    url.startsWith("http") ? url : `${API_BASE_URL_IMAGE}${url}`
  );
};

