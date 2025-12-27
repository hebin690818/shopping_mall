/**
 * 复制文本到剪贴板的工具函数
 * 包含兼容性处理和降级方案，支持各种浏览器和移动设备
 */

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @returns Promise<boolean> 复制是否成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) {
    return false;
  }

  // 方法1: 使用现代 Clipboard API (推荐)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Clipboard API 失败，可能是由于：
      // 1. 非 HTTPS 环境（localhost 除外）
      // 2. 权限被拒绝
      // 3. 浏览器不支持
      console.warn("Clipboard API 失败，尝试降级方案:", err);
      // 继续尝试降级方案
    }
  }

  // 方法2: 降级到 document.execCommand (兼容旧浏览器和某些移动浏览器)
  try {
    // 创建一个临时的 textarea 元素
    const textarea = document.createElement("textarea");
    textarea.value = text;
    
    // 设置样式使其不可见但可选中
    textarea.style.position = "fixed";
    textarea.style.left = "-999999px";
    textarea.style.top = "-999999px";
    textarea.style.opacity = "0";
    textarea.setAttribute("readonly", "");
    textarea.setAttribute("aria-hidden", "true");
    
    // 添加到 DOM
    document.body.appendChild(textarea);
    
    // 选中文本
    // 对于 iOS Safari，需要特殊处理
    if (navigator.userAgent.match(/ipad|iphone/i)) {
      // iOS Safari 需要先移除 readonly 属性才能选中
      textarea.removeAttribute("readonly");
      const range = document.createRange();
      range.selectNodeContents(textarea);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      textarea.setSelectionRange(0, text.length);
    } else {
      textarea.select();
      textarea.setSelectionRange(0, text.length);
    }
    
    // 执行复制命令
    const successful = document.execCommand("copy");
    
    // 清理
    document.body.removeChild(textarea);
    
    if (successful) {
      return true;
    }
  } catch (err) {
    console.error("降级复制方案也失败:", err);
  }

  // 方法3: 最后的降级方案 - 使用 Selection API (适用于某些特殊情况)
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-999999px";
    textarea.style.top = "-999999px";
    document.body.appendChild(textarea);
    
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(textarea);
    
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    const successful = document.execCommand("copy");
    document.body.removeChild(textarea);
    
    if (selection) {
      selection.removeAllRanges();
    }
    
    if (successful) {
      return true;
    }
  } catch (err) {
    console.error("所有复制方案都失败:", err);
  }

  return false;
}

/**
 * 检查浏览器是否支持复制功能
 * @returns boolean
 */
export function isClipboardSupported(): boolean {
  return !!(
    (navigator.clipboard && navigator.clipboard.writeText) ||
    document.execCommand
  );
}

