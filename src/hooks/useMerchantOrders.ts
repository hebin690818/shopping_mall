import { useState, useEffect, useRef, useCallback } from "react";
import { message } from "antd";
import { useTranslation } from "react-i18next";
import { api, type OrderStatusAPI, type OrdersResponse } from "@/lib/api";
import { type Order, type OrderStatus } from "@/pages/orders";
import { formatDateTime } from "@/lib/dateUtils";
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
      // 退款申请中，保持原状态（pending 或 shipped）
      // 这里需要根据业务逻辑判断，暂时映射为 delivering（因为通常是从 shipped 状态申请的）
      return "delivering";
    case "refunded":
    case "refund_rejected":
      // 退款完成（已退款或已拒绝），订单完成（终态）
      return "completed";
    default:
      return "pending";
  }
};

// 将API订单数据转换为前端订单格式
const mapApiOrderToOrder = (apiOrder: any): Order => {
  return {
    id: String(apiOrder.id || ""),
    orderNumber: apiOrder.order_no || `ORD-${apiOrder.id}`,
    date: formatDateTime(apiOrder.created_at),
    status: mapApiStatusToOrderStatus(apiOrder.status),
    apiStatus: apiOrder.status,
    image: apiOrder.image || apiOrder.image_url || productImage,
    name: apiOrder.name || "",
    store: apiOrder.store || apiOrder.merchant_name || "",
    price: String(apiOrder.price || "0"),
    quantity: apiOrder.amount || 1,
    total: String(apiOrder.total_price || "0"),
    paymentAmount: apiOrder.total_price ? String(apiOrder.total_price) : undefined,
    logisticsCompany: apiOrder.shipping_company,
    logisticsNumber: undefined,
    shippingTime: apiOrder.shipped_at,
    paymentTime: undefined,
    orderIndex: apiOrder.order_index
      ? typeof apiOrder.order_index === "string"
        ? BigInt(apiOrder.order_index)
        : BigInt(apiOrder.order_index)
      : undefined,
    tracking_number: apiOrder.tracking_number,
    updated_at: apiOrder.updated_at,
    created_at: apiOrder.created_at,
    refund_rejection_reason: apiOrder.refund_rejection_reason,
    product_image_url: apiOrder.product_image_url,
    product_name: apiOrder.product_name,
    merchant_name: apiOrder.merchant_name,
    merchant_phone: apiOrder.merchant_phone,
    buyer_name: apiOrder.buyer_name,
    buyer_phone: apiOrder.buyer_phone,
    buyer_full_address: apiOrder.buyer_full_address,
    return_shipping_company: apiOrder.return_shipping_company,
    return_tracking_number: apiOrder.return_tracking_number,
  };
};

// 根据标签获取状态筛选参数
const getStatusFilter = (
  activeTab: string
): { status?: OrderStatusAPI; statuses?: OrderStatusAPI[] } => {
  if (activeTab === "completed") {
    return { status: "completed" };
  }
  if (activeTab === "pending") {
    return { status: "refund_requested" };
  }
  if (activeTab === "refund") {
    // 退款 tab：查询所有退款相关状态
    return { statuses: ["refund_requested", "refunded", "refund_rejected"] };
  }
  // "all" 和 "unfinished" 不传status，获取所有订单后在前端过滤
  return {};
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
  if (activeTab === "refund") {
    // 退款 tab：筛选所有退款相关状态的订单
    return orders.filter(
      (order) =>
        order.apiStatus === "refund_requested" ||
        order.apiStatus === "refunded" ||
        order.apiStatus === "refund_rejected"
    );
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
  refresh: (force?: boolean) => Promise<void>;
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
    async (page: number, append = false, force = false) => {
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
        const { status, statuses } = getStatusFilter(activeTab);

        const response: OrdersResponse = await api.getMerchantOrders({
          page,
          page_size: pageSize,
          status,
          statuses,
          force, // 支持强制刷新
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
  const refresh = useCallback(async (force = false) => {
    setCurrentPage(1);
    setHasMore(true);
    await fetchOrders(1, false, force);
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
