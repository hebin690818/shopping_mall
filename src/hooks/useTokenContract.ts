import { useReadContract, usePublicClient, useWalletClient } from 'wagmi';
import { tokenAbi, TOKEN_CONTRACT_ADDRESS } from '@/abi/token';
import { useConnection } from 'wagmi';
import { parseUnits } from 'viem';
import type { Address } from 'viem';
import type { TransactionReceipt } from 'viem';

/**
 * Token合约Hook
 * 提供Token合约的写入和读取方法
 */
export const useTokenContract = () => {
  const { address } = useConnection();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  /**
   * 授权代币
   * @param spender 被授权地址
   * @param amount 授权数量（字符串格式，如 "100"，或 BigInt 用于无限授权）
   * @param decimals 小数位数，默认18（当 amount 为 BigInt 时忽略）
   * @returns 交易收据
   */
  const approve = async (
    spender: Address,
    amount: string | bigint,
    decimals = 18
  ): Promise<TransactionReceipt> => {
    if (!address) {
      throw new Error('钱包未连接');
    }
    if (!publicClient || !walletClient) {
      throw new Error('客户端未初始化');
    }

    // 如果传入的是 BigInt，直接使用；否则解析字符串
    const amountWei = typeof amount === 'bigint' ? amount : parseUnits(amount, decimals);

    // 1. 模拟合约调用
    const { request } = await publicClient.simulateContract({
      account: address,
      address: TOKEN_CONTRACT_ADDRESS,
      abi: tokenAbi,
      functionName: 'approve',
      args: [spender, amountWei],
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
   * 转账代币
   * @param to 接收地址
   * @param amount 转账数量（字符串格式，如 "100"）
   * @param decimals 小数位数，默认18
   * @returns 交易收据
   */
  const transfer = async (
    to: Address,
    amount: string,
    decimals = 18
  ): Promise<TransactionReceipt> => {
    if (!address) {
      throw new Error('钱包未连接');
    }
    if (!publicClient || !walletClient) {
      throw new Error('客户端未初始化');
    }

    const amountWei = parseUnits(amount, decimals);

    // 1. 模拟合约调用
    const { request } = await publicClient.simulateContract({
      account: address,
      address: TOKEN_CONTRACT_ADDRESS,
      abi: tokenAbi,
      functionName: 'transfer',
      args: [to, amountWei],
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
   * 铸造代币（仅测试用）
   * @param to 接收地址
   * @param amount 铸造数量（字符串格式，如 "1000"）
   * @param decimals 小数位数，默认18
   * @returns 交易收据
   */
  const mint = async (
    to: Address,
    amount: string,
    decimals = 18
  ): Promise<TransactionReceipt> => {
    if (!address) {
      throw new Error('钱包未连接');
    }
    if (!publicClient || !walletClient) {
      throw new Error('客户端未初始化');
    }

    const amountWei = parseUnits(amount, decimals);

    // 1. 模拟合约调用
    const { request } = await publicClient.simulateContract({
      account: address,
      address: TOKEN_CONTRACT_ADDRESS,
      abi: tokenAbi,
      functionName: 'mint',
      args: [to, amountWei],
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
    approve,
    transfer,
    mint,
  };
};

/**
 * 查询Token合约数据的Hook
 */
export const useTokenQuery = () => {
  const { address } = useConnection();

  /**
   * 查询代币余额
   */
  const useBalance = (account?: Address) => {
    return useReadContract({
      address: TOKEN_CONTRACT_ADDRESS,
      abi: tokenAbi,
      functionName: 'balanceOf',
      args: [account || address || '0x0'],
      query: {
        enabled: !!account || !!address,
      },
    });
  };

  /**
   * 查询授权额度
   */
  const useAllowance = (owner?: Address, spender?: Address) => {
    return useReadContract({
      address: TOKEN_CONTRACT_ADDRESS,
      abi: tokenAbi,
      functionName: 'allowance',
      args: [owner || address || '0x0', spender || '0x0'],
      query: {
        enabled: !!(owner || address) && !!spender,
      },
    });
  };

  /**
   * 查询代币信息
   */
  const useTokenInfo = () => {
    const name = useReadContract({
      address: TOKEN_CONTRACT_ADDRESS,
      abi: tokenAbi,
      functionName: 'name',
    });

    const symbol = useReadContract({
      address: TOKEN_CONTRACT_ADDRESS,
      abi: tokenAbi,
      functionName: 'symbol',
    });

    const decimals = useReadContract({
      address: TOKEN_CONTRACT_ADDRESS,
      abi: tokenAbi,
      functionName: 'decimals',
    });

    const totalSupply = useReadContract({
      address: TOKEN_CONTRACT_ADDRESS,
      abi: tokenAbi,
      functionName: 'totalSupply',
    });

    return {
      name: name.data,
      symbol: symbol.data,
      decimals: decimals.data,
      totalSupply: totalSupply.data,
      isLoading: name.isLoading || symbol.isLoading || decimals.isLoading || totalSupply.isLoading,
    };
  };

  return {
    useBalance,
    useAllowance,
    useTokenInfo,
  };
};

