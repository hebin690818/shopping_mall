import { useEffect, useState, useRef } from 'react';
import { useConnection, useSignMessage } from 'wagmi';
import { message } from 'antd';
import { walletLogin, generateSignMessage } from '@/lib/auth';
import { getToken, removeToken, apiCache, onTokenChange } from '@/lib/api';

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

  // 监听跨标签页的token变化（多标签页同步）
  useEffect(() => {
    const cleanup = onTokenChange((action, token) => {
      // 当其他标签页设置或删除token时，同步当前标签页的状态
      if (action === 'set' && token) {
        setIsAuthenticated(true);
        // 如果当前钱包已连接且地址匹配，更新认证状态
        if (isConnected && address) {
          console.log('其他标签页已登录，同步登录状态');
        }
      } else if (action === 'remove') {
        setIsAuthenticated(false);
        // 清除登录尝试记录，允许重新登录
        loginAttemptRef.current = null;
        console.log('其他标签页已登出，同步登出状态');
      }
    });

    return cleanup;
  }, [isConnected, address]);

  // 监听 401 未授权事件
  useEffect(() => {
    const handleUnauthorized = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: string; url: string }>;
      const errorMessage = customEvent.detail?.message || '登录已过期，请重新登录';
      
      // 清除认证状态
      setIsAuthenticated(false);
      loginAttemptRef.current = null;
      
      // 显示友好的错误提示
      message.warning(errorMessage, 3);
      
      console.warn('收到 401 未授权错误:', customEvent.detail);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
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
        // 跳过事件，避免在钱包断开时触发跨标签页同步（这是本地操作）
        removeToken(true);
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
        // 清除旧的token（跳过事件，这是地址变化导致的本地操作）
        removeToken(true);
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
    // 不跳过事件，触发跨标签页同步
    removeToken(false);
    setIsAuthenticated(false);
    loginAttemptRef.current = null;
    // 清除API缓存
    apiCache.clear();
    apiCache.cancelAll();
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

