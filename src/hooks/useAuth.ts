import { useEffect, useState, useRef } from 'react';
import { useConnection, useSignMessage } from 'wagmi';
import { walletLogin, generateSignMessage } from '../lib/auth';
import { getToken, removeToken } from '../lib/api';

export const useAuth = () => {
  const { isConnected, address } = useConnection();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const loginAttemptRef = useRef<string | null>(null);

  // 检查是否已登录（有token）
  useEffect(() => {
    const token = getToken();
    setIsAuthenticated(!!token);
  }, []);

  // 当钱包连接时，自动进行登录
  useEffect(() => {
    const handleAutoLogin = async () => {
      const currentAddress = address;
      
      // 如果已连接钱包且有地址，但还没有token，则进行登录
      if (isConnected && currentAddress && !getToken() && !isLoggingIn && !isSigning) {
        // 防止重复登录（同一个地址）
        if (loginAttemptRef.current === currentAddress) {
          return;
        }
        
        loginAttemptRef.current = currentAddress;
        setIsLoggingIn(true);
        try {
          // 1. 生成签名消息
          const message = generateSignMessage(currentAddress);
          
          // 2. 请求用户签名
          const signature = await signMessageAsync({ message });
          
          // 3. 使用签名登录
          await walletLogin(signature, currentAddress);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Auto login failed:', error);
          // 登录失败时清除尝试记录，允许重试
          loginAttemptRef.current = null;
          // 登录失败时不清除钱包连接，只清除认证状态
          setIsAuthenticated(false);
        } finally {
          setIsLoggingIn(false);
        }
      } else if (isConnected && currentAddress && getToken()) {
        // 如果已连接且有token，更新认证状态
        setIsAuthenticated(true);
        loginAttemptRef.current = null; // 登录成功，清除尝试记录
      } else if (!isConnected) {
        // 如果钱包断开连接，清除认证状态和token
        setIsAuthenticated(false);
        removeToken();
        loginAttemptRef.current = null;
      }
    };

    handleAutoLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, isSigning]);

  // 手动登录函数
  const handleLogin = async () => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    if (isLoggingIn || isSigning) {
      return;
    }

    setIsLoggingIn(true);
    try {
      // 1. 生成签名消息
      const message = generateSignMessage(address);
      
      // 2. 请求用户签名
      const signature = await signMessageAsync({ message });
      
      // 3. 使用签名登录
      await walletLogin(signature, address);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login failed:', error);
      setIsAuthenticated(false);
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 登出函数
  const handleLogout = () => {
    removeToken();
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    isLoggingIn: isLoggingIn || isSigning,
    login: handleLogin,
    logout: handleLogout,
    address,
    isConnected,
  };
};

