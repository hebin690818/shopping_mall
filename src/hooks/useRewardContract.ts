import { useReadContract, usePublicClient, useWalletClient } from 'wagmi';
import { rewardAbi, REWARD_CONTRACT_ADDRESS } from '../abi/reward';
import { useConnection } from 'wagmi';
import type { Address } from 'viem';
import type { TransactionReceipt } from 'viem';

/**
 * Reward合约Hook
 * 提供Reward合约的写入和读取方法
 */
export const useRewardContract = () => {
  const { address } = useConnection();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  /**
   * 领取奖励
   * @returns 交易收据
   */
  const claim = async (): Promise<TransactionReceipt> => {
    if (!address) {
      throw new Error('钱包未连接');
    }
    if (!publicClient || !walletClient) {
      throw new Error('客户端未初始化');
    }

    // 1. 模拟合约调用
    const { request } = await publicClient.simulateContract({
      account: address,
      address: REWARD_CONTRACT_ADDRESS,
      abi: rewardAbi,
      functionName: 'claim',
      args: [],
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
    claim,
  };
};

/**
 * 查询Reward合约数据的Hook
 */
export const useRewardQuery = () => {
  const { address } = useConnection();

  /**
   * 查询待领取奖励
   */
  const usePendingReward = (user?: Address) => {
    return useReadContract({
      address: REWARD_CONTRACT_ADDRESS,
      abi: rewardAbi,
      functionName: 'pendingReward',
      args: [user || address || '0x0'],
      query: {
        enabled: !!user || !!address,
      },
    });
  };

  /**
   * 查询用户算力
   */
  const useUserPower = (user?: Address) => {
    return useReadContract({
      address: REWARD_CONTRACT_ADDRESS,
      abi: rewardAbi,
      functionName: 'userPower',
      args: [user || address || '0x0'],
      query: {
        enabled: !!user || !!address,
      },
    });
  };

  /**
   * 查询总算力
   */
  const useTotalPower = () => {
    return useReadContract({
      address: REWARD_CONTRACT_ADDRESS,
      abi: rewardAbi,
      functionName: 'totalPower',
    });
  };

  return {
    usePendingReward,
    useUserPower,
    useTotalPower,
  };
};

