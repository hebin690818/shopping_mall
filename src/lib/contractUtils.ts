import { formatUnits, parseUnits } from 'viem';
import { MARKET_CONTRACT_ADDRESS, TOKEN_CONTRACT_ADDRESS, REWARD_CONTRACT_ADDRESS } from './config';

/**
 * 格式化代币金额
 * @param amount 金额（BigInt）
 * @param decimals 小数位数，默认18
 * @param displayDecimals 显示的小数位数，默认2
 */
export const formatTokenAmount = (
  amount: bigint | undefined,
  decimals = 18,
  displayDecimals = 2
): string => {
  if (!amount || amount === 0n) return '0.00';
  
  // 使用 formatUnits 然后转换为数字，避免精度损失
  const formatted = formatUnits(amount, decimals);
  const num = Number(formatted);
  
  // 处理科学计数法
  if (num < 1e-6 && num > 0) {
    return num.toExponential(displayDecimals);
  }
  
  // 使用 toFixed 并移除尾随零
  const fixed = num.toFixed(displayDecimals);
  return fixed.replace(/\.?0+$/, '') || '0';
};

/**
 * 解析代币金额为BigInt
 * @param amount 金额字符串或数字
 * @param decimals 小数位数，默认18
 */
export const parseTokenAmount = (amount: string | number, decimals = 18): bigint => {
  // 如果是数字，转换为字符串，确保精度
  const amountStr = typeof amount === 'number' 
    ? amount.toFixed(decimals).replace(/\.?0+$/, '') 
    : amount;
  
  // 验证输入格式
  if (!/^\d+(\.\d+)?$/.test(amountStr.trim())) {
    throw new Error(`无效的金额格式: ${amountStr}`);
  }
  
  try {
    return parseUnits(amountStr, decimals);
  } catch (error) {
    throw new Error(`解析金额失败: ${amountStr}, 错误: ${error}`);
  }
};

/**
 * 检查是否需要授权
 * @param allowance 当前授权额度
 * @param requiredAmount 需要的额度
 */
export const needsApproval = (
  allowance: bigint | undefined,
  requiredAmount: bigint
): boolean => {
  if (!allowance || allowance === 0n) return true;
  // 添加5%的缓冲，避免精度问题导致的重复授权
  const buffer = (requiredAmount * 95n) / 100n;
  return allowance < buffer;
};

/**
 * 安全的大数除法（保持精度）
 * @param numerator 分子
 * @param denominator 分母
 * @param precision 精度倍数（默认10^18）
 * @returns 结果（已乘以精度倍数）
 */
export const safeDivide = (
  numerator: bigint,
  denominator: bigint,
  precision = 10n ** 18n
): bigint => {
  if (denominator === 0n) {
    throw new Error('除数不能为零');
  }
  // 先乘以精度，再除以分母，避免精度损失
  return (numerator * precision) / denominator;
};

/**
 * 计算百分比（保持精度）
 * @param part 部分值
 * @param total 总值
 * @returns 百分比（0-100）
 */
export const calculatePercentage = (
  part: bigint | undefined,
  total: bigint | undefined
): number => {
  if (!part || !total || total === 0n || part === 0n) return 0;
  
  // 使用安全除法，先乘以10000（保留2位小数），再除以100
  const precision = 10000n;
  const result = safeDivide(part, total, precision);
  return Number(result) / 100;
};

/**
 * 将电话号码字符串转换为BigInt
 * @param phoneNumber 电话号码字符串，如 "13800138000"
 */
export const phoneToBigInt = (phoneNumber: string): bigint => {
  // 移除所有非数字字符
  const digits = phoneNumber.replace(/\D/g, '');
  if (!digits) {
    throw new Error('无效的电话号码');
  }
  return BigInt(digits);
};

/**
 * 获取订单索引（从交易事件中提取）
 * @param receipt 交易收据
 */
export const getOrderIndexFromReceipt = (receipt: {
  logs?: Array<{
    eventName?: string;
    args?: { orderIndex?: bigint };
    topics?: string[];
  }>;
}): bigint | null => {
  if (!receipt?.logs) return null;

  // 查找OrderCreated事件
  for (const log of receipt.logs) {
    if (log.eventName === 'OrderCreated' && log.args?.orderIndex) {
      return log.args.orderIndex;
    }
    // 如果没有eventName，尝试从topics中解析
    if (log.topics && log.topics.length > 1) {
      // OrderCreated事件的第一个indexed参数是orderIndex
      try {
        return BigInt(log.topics[1]);
      } catch {
        // 忽略解析错误
      }
    }
  }

  return null;
};

/**
 * 订单状态枚举
 */
export const OrderStatus = {
  Pending: 0,
  Completed: 1,
  Refunded: 2,
} as const;

/**
 * 获取订单状态文本
 */
export const getOrderStatusText = (status: number): string => {
  switch (status) {
    case OrderStatus.Pending:
      return '待确认';
    case OrderStatus.Completed:
      return '已完成';
    case OrderStatus.Refunded:
      return '已退款';
    default:
      return '未知';
  }
};

/**
 * 合约地址常量
 */
export const CONTRACT_ADDRESSES = {
  MARKET: MARKET_CONTRACT_ADDRESS,
  REWARD: REWARD_CONTRACT_ADDRESS,
  TOKEN: TOKEN_CONTRACT_ADDRESS,
} as const;
