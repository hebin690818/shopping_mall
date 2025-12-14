import { useState, useEffect, useRef, useCallback } from "react";
import { message } from "antd";
import { useTranslation } from "react-i18next";
import { api, type OrderStatusAPI, type OrdersResponse } from "@/lib/api";
import { type Order, type OrderStatus } from "@/pages/orders";
import productImage from "@/assets/product.png";

// 将API订单状态映射到前端订单状态
const mapApiStatusToOrderStatus = (apiStatus: OrderStatusAPI): OrderStatus => {
  switch (apiStatus) {
    case "pending":
      return "pending";
    case "shipped":
      return "delivering";
    case "completed":
      return "completed";
    case "refund_requested":
    case "refunded":
      return "completed";
    default:
      return "pending";
  }
};

// 将API订单数据转换为前端订单格式
const mapApiOrderToOrder = (apiOrder: any): Order => {
  const productData = apiOrder.product || {};

  return {
    id: String(apiOrder.id || ""),
    orderNumber:
      apiOrder.order_number || apiOrder.orderNumber || `ORD-${apiOrder.id}`,
    date: apiOrder.date || apiOrder.created_at?.split("T")[0] || "",
    status: mapApiStatusToOrderStatus(apiOrder.status),
    apiStatus: apiOrder.status, // 保存原始API状态
    product: {
      image: productData.image || productData.image_url || productImage,
      name: productData.name || "",
      store: productData.store || productData.merchant_name || "",
      price: String(productData.price || "0"),
      quantity: productData.quantity || 1,
    },
    total: String(apiOrder.total || "0"),
    paymentAmount: apiOrder.payment_amount
      ? String(apiOrder.payment_amount)
      : apiOrder.paymentAmount
      ? String(apiOrder.paymentAmount)
      : undefined,
    logisticsCompany: apiOrder.logistics_company || apiOrder.logisticsCompany,
    logisticsNumber: apiOrder.logistics_number || apiOrder.logisticsNumber,
    shippingTime: apiOrder.shipping_time || apiOrder.shippingTime,
    paymentTime: apiOrder.payment_time || apiOrder.paymentTime,
    orderIndex: apiOrder.order_index
      ? BigInt(apiOrder.order_index)
      : apiOrder.orderIndex
      ? typeof apiOrder.orderIndex === "string"
        ? BigInt(apiOrder.orderIndex)
        : BigInt(apiOrder.orderIndex)
      : undefined,
  };
};

// 根据标签获取状态筛选参数
const getStatusFilter = (activeTab: string): OrderStatusAPI | undefined => {
  if (activeTab === "completed") {
    return "completed";
  }
  if (activeTab === "pending") {
    return "refund_requested";
  }
  // "all" 和 "unfinished" 不传status，获取所有订单后在前端过滤
  return undefined;
};

// 过滤订单（用于前端筛选）
const filterOrders = (orders: Order[], activeTab: string): Order[] => {
  if (activeTab === "all") return orders;
  if (activeTab === "completed") {
    return orders.filter((order) => order.status === "completed");
  }
  if (activeTab === "unfinished") {
    return orders.filter((order) => order.status !== "completed");
  }
  if (activeTab === "pending") {
    return orders.filter((order) => order.apiStatus === "refund_requested");
  }
  return orders;
};

interface UseMerchantOrdersOptions {
  activeTab: string;
  pageSize?: number;
  enabled?: boolean;
}

interface UseMerchantOrdersReturn {
  orders: Order[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useMerchantOrders(
  options: UseMerchantOrdersOptions
): UseMerchantOrdersReturn {
  const { activeTab, pageSize = 20, enabled = true } = options;
  const { t } = useTranslation("common");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadingRef = useRef(false);
  const errorShownRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 获取订单数据
  const fetchOrders = useCallback(
    async (page: number, append = false) => {
      // 防止重复请求
      if (loadingRef.current) {
        return;
      }

      loadingRef.current = true;
      setLoading(true);
      setError(null);
      errorShownRef.current = false;

      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const status = getStatusFilter(activeTab);

        const response: OrdersResponse = await api.getMerchantOrders({
          page,
          page_size: pageSize,
          status,
        });

        // 检查是否被取消
        if (abortController.signal.aborted) {
          return;
        }

        // 处理响应数据
        const ordersArray = Array.isArray(response.data) ? response.data : [];
        const mappedOrders = ordersArray.map(mapApiOrderToOrder);

        // 前端过滤（用于 unfinished 标签）
        const filteredOrders = filterOrders(mappedOrders, activeTab);

        if (append) {
          setOrders((prev) => [...prev, ...filteredOrders]);
        } else {
          setOrders(filteredOrders);
        }

        setCurrentPage(page);
        setHasMore(ordersArray.length >= pageSize);
        errorShownRef.current = false;
      } catch (err: any) {
        // 如果是取消的请求，不处理错误
        if (err?.name === "AbortError" || abortController.signal.aborted) {
          return;
        }

        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        // 只在首次错误时显示消息，避免重复提示
        if (!errorShownRef.current) {
          errorShownRef.current = true;
          message.error(
            error.message || t("messages.loadFailed") || "加载订单失败"
          );
        }

        if (!append) {
          setOrders([]);
        }
        setHasMore(false);
      } finally {
        if (!abortController.signal.aborted) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    },
    [activeTab, pageSize, t]
  );

  // 刷新订单列表
  const refresh = useCallback(async () => {
    setCurrentPage(1);
    setHasMore(true);
    await fetchOrders(1, false);
  }, [fetchOrders]);

  // 加载更多
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    await fetchOrders(currentPage + 1, true);
  }, [loading, hasMore, currentPage, fetchOrders]);

  // 初始加载和标签切换时重新加载
  useEffect(() => {
    if (!enabled) {
      setOrders([]);
      setLoading(false);
      return;
    }

    refresh();

    // 清理函数：取消进行中的请求
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      loadingRef.current = false;
    };
  }, [enabled, refresh]);

  return {
    orders,
    loading,
    error,
    hasMore,
    refresh,
    loadMore,
  };
}

