import { API_BASE_URL } from "./config";

// Token存储键名
const TOKEN_KEY = "auth_token";

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

// 请求缓存和去重管理
interface PendingRequest {
  promise: Promise<any>;
  abortController: AbortController;
  timestamp: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  expireTime: number;
}

class RequestManager {
  // 正在进行的请求
  private pendingRequests: Map<string, PendingRequest> = new Map();

  // 请求缓存（仅用于 GET 请求）
  private cache: Map<string, CacheEntry> = new Map();

  // 默认缓存时间：30秒
  private defaultCacheTime = 30 * 1000;

  // 清理过期缓存的间隔
  private cacheCleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // 定期清理过期缓存和超时的请求
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // 每分钟清理一次
  }

  // 生成请求唯一键
  getRequestKey(method: string, url: string, body?: any): string {
    const bodyStr = body ? JSON.stringify(body) : "";
    return `${method}:${url}:${bodyStr}`;
  }

  // 清理过期缓存和超时请求
  private cleanup(): void {
    const now = Date.now();

    // 清理过期缓存
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expireTime) {
        this.cache.delete(key);
      }
    }

    // 清理超时的请求（超过5分钟未完成的请求）
    const timeout = 5 * 60 * 1000;
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > timeout) {
        request.abortController.abort();
        this.pendingRequests.delete(key);
      }
    }
  }

  // 获取缓存的请求（仅 GET 请求）
  getCachedRequest<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > entry.expireTime) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  // 设置缓存
  setCache<T>(key: string, data: T, cacheTime?: number): void {
    const now = Date.now();
    const expireTime = now + (cacheTime || this.defaultCacheTime);

    this.cache.set(key, {
      data,
      timestamp: now,
      expireTime,
    });
  }

  // 清除指定缓存
  clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    // 支持通配符清除
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // 获取或创建请求
  async getOrCreateRequest<T>(
    key: string,
    requestFn: (abortController: AbortController) => Promise<T>,
    options?: {
      cache?: boolean;
      cacheTime?: number;
      force?: boolean; // 强制重新请求，忽略缓存
    }
  ): Promise<T> {
    // 如果强制刷新，先清除缓存和进行中的请求
    if (options?.force) {
      this.cache.delete(key);
      const pending = this.pendingRequests.get(key);
      if (pending) {
        pending.abortController.abort();
        this.pendingRequests.delete(key);
      }
    }

    // 检查缓存（仅 GET 请求且未强制刷新）
    if (options?.cache && !options?.force) {
      const cached = this.getCachedRequest<T>(key);
      if (cached !== null) {
        return cached;
      }
    }

    // 检查是否有正在进行的相同请求
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending.promise as Promise<T>;
    }

    // 创建新的请求
    const abortController = new AbortController();
    const promise = requestFn(abortController)
      .then((result) => {
        // 请求成功，缓存结果（如果需要）
        if (options?.cache) {
          this.setCache(key, result, options.cacheTime);
        }
        // 移除进行中的请求
        this.pendingRequests.delete(key);
        return result;
      })
      .catch((error) => {
        // 请求失败，移除进行中的请求
        this.pendingRequests.delete(key);
        throw error;
      });

    // 记录进行中的请求
    this.pendingRequests.set(key, {
      promise,
      abortController,
      timestamp: Date.now(),
    });

    return promise;
  }

  // 取消指定请求
  cancelRequest(key: string): void {
    const pending = this.pendingRequests.get(key);
    if (pending) {
      pending.abortController.abort();
      this.pendingRequests.delete(key);
    }
  }

  // 取消所有请求
  cancelAllRequests(): void {
    for (const request of this.pendingRequests.values()) {
      request.abortController.abort();
    }
    this.pendingRequests.clear();
  }

  // 销毁管理器
  destroy(): void {
    this.cancelAllRequests();
    this.cache.clear();
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }
  }
}

// 创建全局请求管理器实例
const requestManager = new RequestManager();

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
  image_url: string;
}

// 商品类型
export interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
  category_id?: number;
  merchant_id?: number;
  [key: string]: any; // 允许其他字段
}

// 商品列表请求参数
export interface GetProductsParams {
  category_id?: number;
  is_featured?: number;
  merchant_id?: number;
  name?: string;
  order?: string;
  page?: number;
  page_size?: number;
  sort?: string;
  status?: string;
}

// 商品列表响应
export interface ProductsResponse {
  data: Product[];
  total?: number;
  page?: number;
  page_size?: number;
  [key: string]: any;
}

// 图片上传响应
export interface UploadImageResponse {
  filename: string;
  size: number;
  url: string;
}

// 创建商品请求参数
export interface CreateProductRequest {
  category_id: number;
  description: string;
  image_url: string;
  name: string;
  price: number;
}

// 更新商品请求参数
export interface UpdateProductRequest {
  id: number;
  category_id: number;
  description: string;
  image_url: string;
  name: string;
  price: number;
  status?: string;
}

// 商家详情类型
export interface MerchantDetail {
  id: number;
  name: string;
  description?: string;
  phone?: string;
  wallet_address?: string;
  [key: string]: any; // 允许其他字段
}

// 商家列表项类型
export interface MerchantListItem {
  id: number | string;
  name: string;
  category?: string;
  cover?: string;
  image_url?: string;
  description?: string;
  [key: string]: any; // 允许其他字段
}

// 获取活跃商家列表请求参数
export interface GetActiveMerchantsParams {
  page?: number;
  page_size?: number;
}

// 商家列表响应
export interface MerchantsResponse {
  data: MerchantListItem[];
  total?: number;
  page?: number;
  page_size?: number;
  [key: string]: any;
}

// 地址信息
export interface Address {
  id: number;
  address: string;
  phone: string;
  recipient_name: string;
  [key: string]: any; // 允许其他字段
}

// 创建/更新地址请求参数
export interface AddressRequest {
  address: string;
  phone: string;
  recipient_name: string;
}

// 更新地址请求参数（包含 address_id）
export interface UpdateAddressRequest {
  address_id: number;
  address: string;
  phone: string;
  recipient_name: string;
}

// 订单状态类型
export type OrderStatusAPI =
  | "pending"
  | "shipped"
  | "completed"
  | "refund_requested"
  | "refunded";

// 获取买家订单请求参数
export interface GetBuyerOrdersParams {
  page?: number;
  page_size?: number;
  status?: OrderStatusAPI;
  statuses?: OrderStatusAPI[];
}

// 获取商家订单请求参数
export interface GetMerchantOrdersParams {
  page?: number;
  page_size?: number;
  status?: OrderStatusAPI;
  statuses?: OrderStatusAPI[];
}

// API订单类型（后端返回的格式）
export interface OrderAPI {
  id: string | number;
  order_number?: string;
  orderNumber?: string;
  date?: string;
  created_at?: string;
  status: OrderStatusAPI;
  product?: {
    id?: string | number;
    name?: string;
    image?: string;
    image_url?: string;
    price?: string | number;
    store?: string;
    merchant_name?: string;
    quantity?: number;
  };
  total?: string | number;
  payment_amount?: string | number;
  paymentAmount?: string | number;
  logistics_company?: string;
  logisticsCompany?: string;
  logistics_number?: string;
  logisticsNumber?: string;
  shipping_time?: string;
  shippingTime?: string;
  payment_time?: string;
  paymentTime?: string;
  order_index?: string | number;
  orderIndex?: string | number;
  [key: string]: any; // 允许其他字段
}

// 订单列表响应
export interface OrdersResponse {
  data: OrderAPI[];
  total?: number;
  page?: number;
  page_size?: number;
  [key: string]: any;
}

// 请求选项接口
interface RequestOptions {
  skipDedup?: boolean; // 跳过去重
  cache?: boolean; // 是否缓存
  cacheTime?: number; // 缓存时间（毫秒）
  force?: boolean; // 强制刷新
  method?: RequestInit["method"];
  headers?: RequestInit["headers"];
  body?: RequestInit["body"];
  signal?: RequestInit["signal"];
  [key: string]: any; // 允许其他RequestInit属性
}

// 通用API请求函数
async function request<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { skipDedup, cache, cacheTime, force, ...fetchOptions } = options;
  const method = fetchOptions.method || "GET";
  const token = getToken();
  const url = `${API_BASE_URL}${endpoint}`;
  const requestKey = requestManager.getRequestKey(
    method,
    url,
    fetchOptions.body
  );

  // 如果是 GET 请求且启用缓存，使用请求管理器
  if (method === "GET" && cache && !skipDedup) {
    return requestManager.getOrCreateRequest<ApiResponse<T>>(
      requestKey,
      async (abortController) => {
        return performRequest<T>(
          url,
          fetchOptions,
          token,
          abortController.signal
        );
      },
      { cache: true, cacheTime, force }
    );
  }

  // 如果启用去重（非 GET 请求或未启用缓存），使用请求管理器
  if (!skipDedup) {
    return requestManager.getOrCreateRequest<ApiResponse<T>>(
      requestKey,
      async (abortController) => {
        return performRequest<T>(
          url,
          fetchOptions,
          token,
          abortController.signal
        );
      },
      { cache: false, force }
    );
  }

  // 跳过去重，直接请求
  return performRequest<T>(url, fetchOptions, token);
}

// 执行实际的请求
async function performRequest<T = any>(
  url: string,
  options: RequestInit,
  token: string | null,
  signal?: AbortSignal
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // 如果有token，添加到请求头
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    signal,
  });

  // 处理非JSON响应
  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    const text = await response.text();
    throw new Error(`API Error: ${text}`);
  }

  const data = await response.json();

  // 如果响应包含token，自动保存
  if (data.token) {
    setToken(data.token);
  }

  // 如果token在响应头中
  const responseToken = response.headers
    .get("Authorization")
    ?.replace("Bearer ", "");
  if (responseToken) {
    setToken(responseToken);
  }

  if (!response.ok) {
    throw new Error(data.message || `API Error: ${response.status}`);
  }

  return data;
}

// 导出请求管理器的方法
export const apiCache = {
  clear: (pattern?: string) => requestManager.clearCache(pattern),
  cancelRequest: (key: string) => requestManager.cancelRequest(key),
  cancelAll: () => requestManager.cancelAllRequests(),
};

// API方法
export const api = {
  // 用户登录
  async login(params: LoginRequest): Promise<LoginResponse> {
    const response = await request<LoginResponse>("/shop/api/users/login", {
      method: "POST",
      body: JSON.stringify(params),
    });

    // 如果响应中有token，保存它
    if (response.token) {
      setToken(response.token);
    } else if (response.data?.token) {
      setToken(response.data.token);
    }

    return response.data || (response as LoginResponse);
  },

  // 获取分类列表
  async getCategories(options?: { force?: boolean }): Promise<Category[]> {
    const response = await request<Category[]>("/shop/api/categories", {
      method: "GET",
      cache: true, // 启用缓存
      cacheTime: 5 * 60 * 1000, // 缓存5分钟
      force: options?.force, // 支持强制刷新
    });
    return response.data || [];
  },

  // 获取商品列表
  async getProducts(
    params?: GetProductsParams & { force?: boolean }
  ): Promise<ProductsResponse> {
    const { force, ...requestParams } = params || {};

    // 构建请求体，只包含有值的参数
    const requestBody: Record<string, any> = {};
    if (requestParams?.category_id !== undefined) {
      requestBody.category_id = requestParams.category_id;
    }
    if (requestParams?.is_featured !== undefined) {
      requestBody.is_featured = requestParams.is_featured;
    }
    if (requestParams?.merchant_id !== undefined) {
      requestBody.merchant_id = requestParams.merchant_id;
    }
    if (requestParams?.name !== undefined) {
      requestBody.name = requestParams.name;
    }
    if (requestParams?.order !== undefined) {
      requestBody.order = requestParams.order;
    }
    if (requestParams?.page !== undefined) {
      requestBody.page = requestParams.page;
    }
    if (requestParams?.page_size !== undefined) {
      requestBody.page_size = requestParams.page_size;
    }
    if (requestParams?.sort !== undefined) {
      requestBody.sort = requestParams.sort;
    }
    if (requestParams?.status !== undefined) {
      requestBody.status = requestParams.status;
    }

    const response = await request<any>("/shop/api/product/products", {
      method: "POST",
      body: JSON.stringify(requestBody),
      force: force, // 支持强制刷新（POST请求通过请求管理器去重）
    });

    // 处理不同的响应格式
    // 格式1: { data: { data: [...], total: ... } }
    // 格式2: { data: [...] } - 直接是数组
    // 格式3: { data: { list: [...], total: ... } }
    if (Array.isArray(response.data)) {
      return { data: response.data };
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      return response.data;
    } else if (response.data?.list && Array.isArray(response.data.list)) {
      return { data: response.data.list, total: response.data.total };
    } else {
      return { data: [] };
    }
  },

  // 获取我的商品列表（商家自己的商品）
  async getMyProducts(options?: { force?: boolean }): Promise<ProductsResponse> {
    const response = await request<any>("/shop/api/product/my", {
      method: "GET",
      cache: true, // 启用缓存
      cacheTime: 30 * 1000, // 缓存30秒
      force: options?.force, // 支持强制刷新
    });

    // 处理响应格式
    // API返回格式：{ code: 0, data: "string" | Array | Object, message: "success" }
    if (response.code === 0 || response.data !== undefined) {
      let products: Product[] = [];

      // 如果data是字符串，尝试解析JSON
      if (typeof response.data === "string") {
        try {
          const parsed = JSON.parse(response.data);
          products = Array.isArray(parsed) ? parsed : [];
        } catch {
          products = [];
        }
      }
      // 如果data是数组，直接使用
      else if (Array.isArray(response.data)) {
        products = response.data;
      }
      // 如果data是对象，可能包含data或list字段
      else if (response.data?.data && Array.isArray(response.data.data)) {
        products = response.data.data;
      } else if (response.data?.list && Array.isArray(response.data.list)) {
        products = response.data.list;
      }

      return {
        data: products,
        total: response.data?.total || products.length,
        page: response.data?.page || 1,
        page_size: response.data?.page_size || products.length,
      };
    }

    return { data: [] };
  },

  // 上传图片
  async uploadImage(file: File): Promise<UploadImageResponse> {
    const token = getToken();
    const url = `${API_BASE_URL}/shop/api/upload/image`;

    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      const text = await response.text();
      throw new Error(`API Error: ${text}`);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `API Error: ${response.status}`);
    }

    return data.data;
  },

  // 创建商品
  async createProduct(params: CreateProductRequest): Promise<string> {
    const response = await request<string>("/shop/api/product/create", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return response.data || "";
  },

  // 更新商品
  async updateProduct(params: UpdateProductRequest): Promise<string> {
    const response = await request<string>("/shop/api/product/update", {
      method: "POST",
      body: JSON.stringify(params),
    });
    // 清除商品列表缓存，确保列表数据更新
    apiCache.clear("GET:/shop/api/product/my");
    return response.data || "";
  },

  // 获取商品详情（通过ID从我的商品列表中查找）
  async getProductById(productId: string | number): Promise<Product | null> {
    try {
      const response = await api.getMyProducts({ force: true });
      const product = response.data.find(
        (p) => String(p.id) === String(productId)
      );
      return product || null;
    } catch (error) {
      console.error("获取商品详情失败:", error);
      return null;
    }
  },

  // GET请求
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return request<T>(endpoint, {
      method: "GET",
    });
  },

  // POST请求
  async post<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  // PUT请求
  async put<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  // DELETE请求
  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return request<T>(endpoint, {
      method: "DELETE",
    });
  },

  // 根据钱包地址获取商家ID
  async getMerchantByWallet(
    wallet_address: string,
    options?: { force?: boolean }
  ): Promise<number | null> {
    const queryParams = new URLSearchParams();
    queryParams.append("wallet_address", wallet_address);

    const response = await request<any>(
      `/shop/api/merchants/wallet?${queryParams.toString()}`,
      {
        method: "GET",
        cache: true, // 启用缓存
        cacheTime: 2 * 60 * 1000, // 缓存2分钟
        force: options?.force, // 支持强制刷新
      }
    );

    // 如果响应成功，返回商家ID（可能是响应数据本身或者是data字段）
    if (response.code === 0 || response.data) {
      // 如果data是数字，直接返回；如果是对象，返回id字段
      if (typeof response.data === "number") {
        return response.data;
      } else if (response.data?.id) {
        return response.data.id;
      } else if (typeof response.data === "string") {
        // 如果是字符串，尝试转换为数字
        const id = parseInt(response.data, 10);
        return isNaN(id) ? null : id;
      }
    }

    return null;
  },

  // 根据商家ID获取商家详情
  async getMerchantById(
    id: number,
    options?: { force?: boolean }
  ): Promise<MerchantDetail | null> {
    const response = await request<MerchantDetail>(
      `/shop/api/merchants/${id}`,
      {
        method: "GET",
        cache: true, // 启用缓存
        cacheTime: 2 * 60 * 1000, // 缓存2分钟
        force: options?.force, // 支持强制刷新
      }
    );

    // 如果响应成功，返回商家详情
    if (response.code === 0 && response.data) {
      return response.data;
    }

    return null;
  },

  // 获取当前登录用户的商家信息
  async getMyMerchant(
    options?: { force?: boolean }
  ): Promise<MerchantDetail | null> {
    const response = await request<any>("/shop/api/merchants/my", {
      method: "GET",
      cache: true, // 启用缓存
      cacheTime: 2 * 60 * 1000, // 缓存2分钟
      force: options?.force, // 支持强制刷新
    });

    // 处理响应格式
    if (response.code === 0) {
      // 如果data是字符串，尝试解析JSON
      if (typeof response.data === "string") {
        try {
          const parsed = JSON.parse(response.data);
          // 如果是对象且有id字段，说明是商家详情对象
          if (parsed && typeof parsed === "object" && parsed.id) {
            return parsed as MerchantDetail;
          }
          // 如果是空字符串或null，返回null
          if (!parsed || parsed === "") {
            return null;
          }
        } catch {
          return null;
        }
      }
      // 如果data是对象，直接返回
      if (
        response.data &&
        typeof response.data === "object" &&
        response.data.id
      ) {
        return response.data as MerchantDetail;
      }
      // 如果data是null或undefined，返回null
      if (!response.data) {
        return null;
      }
    }

    return null;
  },

  // 获取买家订单列表
  async getBuyerOrders(
    params: GetBuyerOrdersParams & { force?: boolean }
  ): Promise<OrdersResponse> {
    const { force, ...requestParams } = params;

    // 构建请求体，只包含有值的参数
    const requestBody: Record<string, any> = {};
    if (requestParams.page !== undefined) {
      requestBody.page = requestParams.page;
    }
    if (requestParams.page_size !== undefined) {
      requestBody.page_size = requestParams.page_size;
    }
    if (requestParams.status !== undefined) {
      requestBody.status = requestParams.status;
    }
    if (requestParams.statuses !== undefined && Array.isArray(requestParams.statuses) && requestParams.statuses.length > 0) {
      requestBody.statuses = requestParams.statuses;
    }

    const response = await request<any>(
      "/shop/api/orders/buyer",
      {
        method: "POST",
        body: JSON.stringify(requestBody),
        force: force, // 支持强制刷新（POST请求通过请求管理器去重）
      }
    );

    // 处理不同的响应格式
    if (response.code === 0) {
      const responseData = response.data;
      const responseAny = response as any;

      // 如果data是数组，直接返回
      if (Array.isArray(responseData)) {
        return {
          data: responseData,
          total: responseAny.total || responseData.length,
          page: params.page || 1,
          page_size: params.page_size || 20,
        };
      }
      // 如果data是对象，包含data数组
      if (responseData?.data && Array.isArray(responseData.data)) {
        return {
          data: responseData.data,
          total:
            responseData.total || responseAny.total || responseData.data.length,
          page: responseData.page || params.page || 1,
          page_size: responseData.page_size || params.page_size || 20,
        };
      }
      // 如果data是对象，包含list数组
      if (responseData?.list && Array.isArray(responseData.list)) {
        return {
          data: responseData.list,
          total:
            responseData.total || responseAny.total || responseData.list.length,
          page: responseData.page || params.page || 1,
          page_size: responseData.page_size || params.page_size || 20,
        };
      }
    }

    // 默认返回空数组
    return {
      data: [],
      total: 0,
      page: params.page || 1,
      page_size: params.page_size || 20,
    };
  },

  // 获取商家订单列表
  async getMerchantOrders(
    params: GetMerchantOrdersParams & { force?: boolean }
  ): Promise<OrdersResponse> {
    const { force, ...requestParams } = params;

    // 构建请求体，只包含有值的参数
    const requestBody: Record<string, any> = {};
    if (requestParams.page !== undefined) {
      requestBody.page = requestParams.page;
    }
    if (requestParams.page_size !== undefined) {
      requestBody.page_size = requestParams.page_size;
    }
    if (requestParams.status !== undefined) {
      requestBody.status = requestParams.status;
    }
    if (requestParams.statuses !== undefined && Array.isArray(requestParams.statuses) && requestParams.statuses.length > 0) {
      requestBody.statuses = requestParams.statuses;
    }

    const response = await request<any>(
      "/shop/api/orders/merchant",
      {
        method: "POST",
        body: JSON.stringify(requestBody),
        force: force, // 支持强制刷新（POST请求通过请求管理器去重）
      }
    );

    // 处理不同的响应格式
    // 支持 code === 0 或直接返回数据的情况
    const responseData = response.data;
    const responseAny = response as any;

    // 如果响应成功（code === 0 或没有code字段）
    if (response.code === 0 || response.code === undefined) {
      // 如果data是数组，直接返回
      if (Array.isArray(responseData)) {
        return {
          data: responseData,
          total: responseAny.total || responseData.length,
          page: params.page || 1,
          page_size: params.page_size || 20,
        };
      }
      // 如果data是对象，包含data数组
      if (responseData?.data && Array.isArray(responseData.data)) {
        return {
          data: responseData.data,
          total:
            responseData.total || responseAny.total || responseData.data.length,
          page: responseData.page || params.page || 1,
          page_size: responseData.page_size || params.page_size || 20,
        };
      }
      // 如果data是对象，包含list数组
      if (responseData?.list && Array.isArray(responseData.list)) {
        return {
          data: responseData.list,
          total:
            responseData.total || responseAny.total || responseData.list.length,
          page: responseData.page || params.page || 1,
          page_size: responseData.page_size || params.page_size || 20,
        };
      }
      // 如果data是null或undefined，返回空数组
      if (responseData === null || responseData === undefined) {
        return {
          data: [],
          total: 0,
          page: params.page || 1,
          page_size: params.page_size || 20,
        };
      }
      // 如果data是对象但没有list字段，返回空数组
      if (typeof responseData === "object" && !Array.isArray(responseData)) {
        return {
          data: [],
          total: responseData.total || 0,
          page: responseData.page || params.page || 1,
          page_size: responseData.page_size || params.page_size || 20,
        };
      }
    }

    // 默认返回空数组
    return {
      data: [],
      total: 0,
      page: params.page || 1,
      page_size: params.page_size || 20,
    };
  },

  // 获取用户地址列表
  async getUserAddresses(options?: { force?: boolean }): Promise<Address[]> {
    const response = await request<any>("/shop/api/user/addresses", {
      method: "GET",
      cache: true, // 启用缓存
      cacheTime: 30 * 1000, // 缓存30秒
      force: options?.force, // 支持强制刷新
    });

    // 处理响应格式
    if (response.code === 0) {
      // 如果data是字符串，尝试解析JSON
      if (typeof response.data === "string") {
        try {
          const parsed = JSON.parse(response.data);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      // 如果data是数组，直接返回
      if (Array.isArray(response.data)) {
        return response.data;
      }
      // 如果data是对象，包含data或list数组
      if (response.data?.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      if (response.data?.list && Array.isArray(response.data.list)) {
        return response.data.list;
      }
    }

    return [];
  },

  // 获取默认收货地址
  async getDefaultAddress(options?: {
    force?: boolean;
  }): Promise<Address | null> {
    const response = await request<any>("/shop/api/user/addresses/default", {
      method: "GET",
      cache: true, // 启用缓存
      cacheTime: 30 * 1000, // 缓存30秒
      force: options?.force, // 支持强制刷新
    });

    // 处理响应格式
    if (response.code === 0) {
      // 如果data是字符串，尝试解析JSON
      if (typeof response.data === "string") {
        try {
          const parsed = JSON.parse(response.data);
          // 如果是对象且有id字段，说明是地址对象
          if (parsed && typeof parsed === "object" && parsed.id) {
            return parsed as Address;
          }
          // 如果是空字符串或null，返回null
          if (!parsed || parsed === "") {
            return null;
          }
        } catch {
          return null;
        }
      }
      // 如果data是对象，直接返回
      if (
        response.data &&
        typeof response.data === "object" &&
        response.data.id
      ) {
        return response.data as Address;
      }
      // 如果data是null或undefined，返回null
      if (!response.data) {
        return null;
      }
    }

    return null;
  },

  // 创建地址
  async createAddress(params: AddressRequest): Promise<Address> {
    const response = await request<Address>("/shop/api/user/addresses", {
      method: "POST",
      body: JSON.stringify(params),
    });

    // 清除地址列表缓存
    apiCache.clear("GET:/shop/api/user/addresses");

    if (response.code === 0 && response.data) {
      return response.data;
    }
    throw new Error(response.message || "创建地址失败");
  },

  // 更新地址
  async updateAddress(id: number, params: AddressRequest): Promise<Address> {
    // 根据接口文档，更新地址使用 POST /shop/api/user/addresses/update
    const updateParams: UpdateAddressRequest = {
      address_id: id,
      address: params.address,
      phone: params.phone,
      recipient_name: params.recipient_name,
    };

    const response = await request<Address>("/shop/api/user/addresses/update", {
      method: "POST",
      body: JSON.stringify(updateParams),
    });

    // 清除地址列表缓存
    apiCache.clear("GET:/shop/api/user/addresses");

    if (response.code === 0 && response.data) {
      return response.data;
    }
    throw new Error(response.message || "更新地址失败");
  },

  // 申请退款
  async applyRefund(orderId: number): Promise<void> {
    await request<void>("/shop/api/orders/refund", {
      method: "POST",
      body: JSON.stringify({ order_id: orderId }),
    });
  },

  // 同意退款
  async approveRefund(orderId: number): Promise<void> {
    const response = await request<void>("/shop/api/orders/refund/approve", {
      method: "POST",
      body: JSON.stringify({ order_id: orderId }),
    });
    if (response.code !== 0 && response.code !== undefined) {
      throw new Error(response.message || "同意退款失败");
    }
  },

  // 拒绝退款
  async rejectRefund(orderId: number, reason: string): Promise<void> {
    const response = await request<void>("/shop/api/orders/refund/reject", {
      method: "POST",
      body: JSON.stringify({ order_id: orderId, reason }),
    });
    if (response.code !== 0 && response.code !== undefined) {
      throw new Error(response.message || "拒绝退款失败");
    }
  },

  // 商家发货
  async shipOrder(params: {
    merchant_address: string;
    order_id: number;
    tracking_number: string;
  }): Promise<void> {
    const response = await request<void>("/shop/api/orders/ship", {
      method: "POST",
      body: JSON.stringify(params),
    });
    if (response.code !== 0 && response.code !== undefined) {
      throw new Error(response.message || "发货失败");
    }
  },

  // 获取活跃商家列表
  async getActiveMerchants(
    params?: GetActiveMerchantsParams & { force?: boolean }
  ): Promise<MerchantsResponse> {
    const { force, ...requestParams } = params || {};

    // 构建请求体
    const requestBody: Record<string, any> = {};
    if (requestParams?.page !== undefined) {
      requestBody.page = requestParams.page;
    }
    if (requestParams?.page_size !== undefined) {
      requestBody.page_size = requestParams.page_size;
    }

    const response = await request<any>("/shop/api/merchants/active", {
      method: "POST",
      body: JSON.stringify(requestBody),
      force: force, // 支持强制刷新
    });

    // 处理不同的响应格式
    if (response.code === 0 || response.data !== undefined) {
      const responseData = response.data;
      const responseAny = response as any;

      // 如果data是数组，直接返回
      if (Array.isArray(responseData)) {
        return {
          data: responseData,
          total: responseAny.total || responseData.length,
          page: requestParams?.page || 0,
          page_size: requestParams?.page_size || responseData.length,
        };
      }
      // 如果data是对象，包含data数组
      if (responseData?.data && Array.isArray(responseData.data)) {
        return {
          data: responseData.data,
          total: responseData.total || responseAny.total || responseData.data.length,
          page: responseData.page || requestParams?.page || 0,
          page_size: responseData.page_size || requestParams?.page_size || 20,
        };
      }
      // 如果data是对象，包含list数组
      if (responseData?.list && Array.isArray(responseData.list)) {
        return {
          data: responseData.list,
          total: responseData.total || responseAny.total || responseData.list.length,
          page: responseData.page || requestParams?.page || 0,
          page_size: responseData.page_size || requestParams?.page_size || 20,
        };
      }
    }

    // 默认返回空数组
    return {
      data: [],
      total: 0,
      page: requestParams?.page || 0,
      page_size: requestParams?.page_size || 20,
    };
  },
};
