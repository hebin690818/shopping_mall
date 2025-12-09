import { api } from "./api";
import { getToken } from "./api";
import type { LoginRequest } from "./api";

// 生成签名消息
export const generateSignMessage = (address: string): string => {
  return `${address.toLowerCase()}`;
};

// 使用签名和地址进行登录
export const walletLogin = async (
  signature: string,
  address: string
): Promise<string | null> => {
  try {
    // 调用登录API
    const loginParams: LoginRequest = {
      signature,
      wallet_address: address.toLowerCase(),
    };

    const response = await api.login(loginParams);

    // 返回token
    return response.token || getToken();
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};
