import { useReadContract, usePublicClient, useWalletClient } from 'wagmi';
import { marketAbi, MARKET_CONTRACT_ADDRESS } from '../abi/market';
import { useConnection } from 'wagmi';
import type { Address } from 'viem';
import type { TransactionReceipt } from 'viem';

/**
 * Market合约Hook
 * 提供Market合约的写入和读取方法
 */
export const useMarketContract = () => {
  const { address } = useConnection();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  /**
   * 注册商家
   * @param name 商家名称
   * @param phoneNumber 电话号码（数字格式）
   * @returns 交易收据
   */
  const registerMerchant = async (
    name: string,
    phoneNumber: bigint
  ): Promise<TransactionReceipt> => {
    if (!address) {
      throw new Error('钱包未连接');
    }
    if (!publicClient || !walletClient) {
      throw new Error('客户端未初始化');
    }

    // 1. 模拟合约调用
    const { request } = await publicClient.simulateContract({
      account: address,
      address: MARKET_CONTRACT_ADDRESS,
      abi: marketAbi,
      functionName: 'registerMerchant',
      args: [name, phoneNumber],
    });

    // 2. 写入合约
    const txid = await walletClient.writeContract(request);

    // 3. 等待交易确认
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txid,
    });

    return receipt;
  };

  /**
   * 创建订单
   * @param merchant 商家地址
   * @param amount 购买数量
   * @param price 商品单价（wei）
   * @param orderId 后端生成的订单ID
   * @returns 交易收据
   */
  const createOrder = async (
    merchant: Address,
    amount: bigint,
    price: bigint,
    orderId: bigint
  ): Promise<TransactionReceipt> => {
    if (!address) {
      throw new Error('钱包未连接');
    }
    if (!publicClient || !walletClient) {
      throw new Error('客户端未初始化');
    }

    // 1. 模拟合约调用
    const { request } = await publicClient.simulateContract({
      account: address,
      address: MARKET_CONTRACT_ADDRESS,
      abi: marketAbi,
      functionName: 'createOrder',
      args: [merchant, amount, price, orderId],
    });

    // 2. 写入合约
    const txid = await walletClient.writeContract(request);

    // 3. 等待交易确认
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txid,
    });

    return receipt;
  };

  /**
   * 确认收货
   * @param orderIndex 订单索引
   * @returns 交易收据
   */
  const confirmReceived = async (
    orderIndex: bigint
  ): Promise<TransactionReceipt> => {
    if (!address) {
      throw new Error('钱包未连接');
    }
    if (!publicClient || !walletClient) {
      throw new Error('客户端未初始化');
    }

    // 1. 模拟合约调用
    const { request } = await publicClient.simulateContract({
      account: address,
      address: MARKET_CONTRACT_ADDRESS,
      abi: marketAbi,
      functionName: 'confirmReceived',
      args: [orderIndex],
    });

    // 2. 写入合约
    const txid = await walletClient.writeContract(request);

    // 3. 等待交易确认
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txid,
    });

    return receipt;
  };

  /**
   * 退款订单
   * @param orderIndex 订单索引
   * @returns 交易收据
   */
  const refundOrder = async (
    orderIndex: bigint
  ): Promise<TransactionReceipt> => {
    if (!address) {
      throw new Error('钱包未连接');
    }
    if (!publicClient || !walletClient) {
      throw new Error('客户端未初始化');
    }

    // 1. 模拟合约调用
    const { request } = await publicClient.simulateContract({
      account: address,
      address: MARKET_CONTRACT_ADDRESS,
      abi: marketAbi,
      functionName: 'refundOrder',
      args: [orderIndex],
    });

    // 2. 写入合约
    const txid = await walletClient.writeContract(request);

    // 3. 等待交易确认
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txid,
    });

    return receipt;
  };

  return {
    registerMerchant,
    createOrder,
    confirmReceived,
    refundOrder,
  };
};

/**
 * 查询Market合约数据的Hook
 */
export const useMarketQuery = () => {
  const { address } = useConnection();

  /**
   * 查询是否为商家
   */
  const useIsMerchant = (account?: Address) => {
    return useReadContract({
      address: MARKET_CONTRACT_ADDRESS,
      abi: marketAbi,
      functionName: 'isMerchant',
      args: [account || address || '0x0'],
      query: {
        enabled: !!account || !!address,
      },
    });
  };

  /**
   * 查询订单详情
   */
  const useOrderDetails = (orderIndex: bigint, enabled = true) => {
    return useReadContract({
      address: MARKET_CONTRACT_ADDRESS,
      abi: marketAbi,
      functionName: 'getOrderDetails',
      args: [orderIndex],
      query: {
        enabled,
      },
    });
  };

  /**
   * 查询订单总数
   */
  const useOrderCount = () => {
    return useReadContract({
      address: MARKET_CONTRACT_ADDRESS,
      abi: marketAbi,
      functionName: 'getOrderCount',
    });
  };

  /**
   * 批量查询订单
   */
  const useOrdersBatch = (orderIndexes: bigint[], enabled = true) => {
    return useReadContract({
      address: MARKET_CONTRACT_ADDRESS,
      abi: marketAbi,
      functionName: 'getOrdersBatch',
      args: [orderIndexes],
      query: {
        enabled: enabled && orderIndexes.length > 0,
      },
    });
  };

  /**
   * 查询商家注册费用
   */
  const useMerchantFee = () => {
    return useReadContract({
      address: MARKET_CONTRACT_ADDRESS,
      abi: marketAbi,
      functionName: 'MERCHANT_FEE',
    });
  };

  return {
    useIsMerchant,
    useOrderDetails,
    useOrderCount,
    useOrdersBatch,
    useMerchantFee,
  };
};

