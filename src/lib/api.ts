import { API_BASE_URL } from './config';

// Token存储键名
const TOKEN_KEY = 'auth_token';

// 获取存储的token
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

// 设置token
export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

// 清除token
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

// API响应类型
export interface ApiResponse<T = any> {
  code?: number;
  message?: string;
  data?: T;
  token?: string;
}

// 登录请求参数
export interface LoginRequest {
  signature: string;
  wallet_address: string;
}

// 登录响应
export interface LoginResponse {
  token: string;
  user?: any;
}

// 分类类型
export interface Category {
  id: string;
  name: string;
  image: string;
}

// 通用API请求函数
async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // 如果有token，添加到请求头
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // 处理非JSON响应
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    const text = await response.text();
    throw new Error(`API Error: ${response.status} ${text}`);
  }

  const data = await response.json();

  // 如果响应包含token，自动保存
  if (data.token) {
    setToken(data.token);
  }

  // 如果token在响应头中
  const responseToken = response.headers.get('Authorization')?.replace('Bearer ', '');
  if (responseToken) {
    setToken(responseToken);
  }

  if (!response.ok) {
    throw new Error(data.message || `API Error: ${response.status}`);
  }

  return data;
}

// API方法
export const api = {
  // 用户登录
  async login(params: LoginRequest): Promise<LoginResponse> {
    const response = await request<LoginResponse>('/shop/api/users/login', {
      method: 'POST',
      body: JSON.stringify(params),
    });

    // 如果响应中有token，保存它
    if (response.token) {
      setToken(response.token);
    } else if (response.data?.token) {
      setToken(response.data.token);
    }

    return response.data || response as LoginResponse;
  },

  // 获取分类列表
  async getCategories(): Promise<Category[]> {
    const response = await request<Category[]>('/shop/api/categories', {
      method: 'GET',
    });
    return response.data || [];
  },

  // GET请求
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return request<T>(endpoint, {
      method: 'GET',
    });
  },

  // POST请求
  async post<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  // PUT请求
  async put<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  // DELETE请求
  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return request<T>(endpoint, {
      method: 'DELETE',
    });
  },
};

