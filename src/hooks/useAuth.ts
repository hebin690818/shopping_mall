import { useEffect, useState, useRef } from 'react';
import { useConnection, useSignMessage } from 'wagmi';
import { walletLogin, generateSignMessage } from '../lib/auth';
import { getToken, removeToken, apiCache } from '../lib/api';

export const useAuth = () => {
  const { isConnected, address } = useConnection();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const loginAttemptRef = useRef<string | null>(null);
  const previousAddressRef = useRef<string | undefined>(undefined);

  // 检查是否已登录（有token）
  useEffect(() => {
    const token = getToken();
    setIsAuthenticated(!!token);
    previousAddressRef.current = address;
  }, []);

  // 当钱包连接时，自动进行登录
  useEffect(() => {
    const handleAutoLogin = async () => {
      const currentAddress = address;
      const previousAddress = previousAddressRef.current;

      // 检测钱包地址变化
      const addressChanged = 
        previousAddress && 
        currentAddress && 
        previousAddress.toLowerCase() !== currentAddress.toLowerCase();

      // 如果钱包断开连接，清除所有状态
      if (!isConnected) {
        setIsAuthenticated(false);
        removeToken();
        apiCache.clear();
        apiCache.cancelAll();
        loginAttemptRef.current = null;
        previousAddressRef.current = undefined;
        return;
      }

      // 如果钱包地址发生变化，清除缓存和token
      if (addressChanged && isConnected && currentAddress) {
        console.log('钱包地址已切换，清除缓存并重新登录');
        // 清除所有API缓存
        apiCache.clear();
        // 取消所有进行中的请求
        apiCache.cancelAll();
        // 清除旧的token
        removeToken();
        // 清除认证状态
        setIsAuthenticated(false);
        // 重置登录尝试记录
        loginAttemptRef.current = null;
      }

      // 更新之前的地址
      previousAddressRef.current = currentAddress;

      // 如果已连接钱包且有地址
      if (isConnected && currentAddress) {
        const hasToken = !!getToken();
        
        // 如果没有token（包括地址变化后清除token的情况），需要登录
        if (!hasToken && !isLoggingIn && !isSigning) {
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
        } else if (hasToken && !addressChanged) {
          // 如果有token且地址未变化，更新认证状态
          setIsAuthenticated(true);
          loginAttemptRef.current = null;
        }
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

