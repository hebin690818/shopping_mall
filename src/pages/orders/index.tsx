import { useState, useEffect, useCallback, useRef } from "react";
import { Button, Typography, message } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { useConnection } from "wagmi";
import { ROUTES } from "@/routes";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CarOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { useMarketContract } from "@/hooks/useMarketContract";
import { useGlobalLoading } from "@/contexts/LoadingProvider";
import { api, type OrderAPI, type OrderStatusAPI } from "@/lib/api";
import product from "@/assets/product.png";

const { Text, Title } = Typography;

import { API_BASE_URL } from "@/lib/config";

export type OrderStatus = "pending" | "delivering" | "completed";

export type Order = {
  id: string;
  orderNumber: string;
  date: string;
  status: OrderStatus;
  apiStatus?: OrderStatusAPI; // 原始API状态，用于判断是否可以申请退款
  image: string;
  name: string;
  store: string;
  price: string;
  quantity: number;
  total: string;
  paymentAmount?: string;
  logisticsCompany?: string;
  logisticsNumber?: string;
  shippingTime?: string;
  paymentTime?: string;
  orderIndex?: bigint; // 合约订单索引
  tracking_number?: string;
  updated_at?: string;
  created_at?: string;
  refund_rejection_reason?: string; // 退款拒绝原因
  product_image_url?: string; // 商品图片URL
  product_name?: string; // 商品名称
};

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
const mapApiOrderToOrder = (apiOrder: OrderAPI): Order => {
  return {
    id: String(apiOrder.id || ""),
    orderNumber: apiOrder.order_no || `ORD-${apiOrder.id}`,
    date: apiOrder.created_at?.split("T")[0] || "",
    status: mapApiStatusToOrderStatus(apiOrder.status),
    apiStatus: apiOrder.status, // 保存原始API状态
    image: apiOrder.image || apiOrder.image_url || product,
    name: apiOrder.name || "",
    store: apiOrder.store || apiOrder.merchant_name || "",
    price: String(apiOrder.price || "0"),
    quantity: apiOrder.amount || 1,
    total: String(apiOrder.total_price || "0"),
    paymentAmount: apiOrder.total_price ? String(apiOrder.total_price) : undefined,
    logisticsCompany: undefined,
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
  };
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation("common");
  const { address, isConnected } = useConnection();
  const { confirmReceived } = useMarketContract();
  const { showLoading, hideLoading } = useGlobalLoading();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isScrolled, setIsScrolled] = useState(false);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(
    null
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [ordersTotal, setOrdersTotal] = useState<number>(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 监听滚动，为固定头部添加背景色
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 加载更多订单
  const loadMoreOrders = useCallback(async () => {
    if (isLoadingOrders || !hasMore || !address) return;

    // 防止重复请求
    if (loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    setIsLoadingOrders(true);

    try {
      // 根据当前选中的标签确定状态筛选
      let status: OrderStatusAPI | undefined;
      let statuses: OrderStatusAPI[] | undefined;
      
      if (activeTab === "pending") {
        status = "pending";
      } else if (activeTab === "delivering") {
        status = "shipped";
      } else if (activeTab === "completed") {
        status = "completed";
      } else if (activeTab === "refund") {
        // 退款 tab：查询所有退款相关状态
        statuses = ["refund_requested", "refunded", "refund_rejected"];
      }

      const response = await api.getBuyerOrders({
        page: currentPage + 1,
        page_size: 20,
        status: status,
        statuses: statuses,
      });

      // 将API订单转换为前端订单格式
      const mappedOrders = response.data.map(mapApiOrderToOrder);

      if (mappedOrders.length > 0) {
        setOrders((prev) => [...prev, ...mappedOrders]);
        setCurrentPage((prev) => prev + 1);
        setHasMore(response.data.length >= 20);
      } else {
        setHasMore(false);
      }
    } catch (error: any) {
      if (error?.name === "AbortError") {
        loadingRef.current = false;
        return;
      }
      console.error("加载更多订单失败:", error);
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setIsLoadingOrders(false);
    }
  }, [address, activeTab, currentPage, isLoadingOrders, hasMore]);

  // 使用 Intersection Observer 实现滚动加载
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingOrders) {
          loadMoreOrders();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoadingOrders, loadMoreOrders]);

  // 标签切换时滚动到顶部
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  // 加载状态标记
  const loadingRef = useRef(false); // 防止重复请求
  const errorShownRef = useRef(false); // 防止重复显示错误

  // 加载订单列表的函数
  const loadOrders = useCallback(async () => {
    if (!address) {
      setOrders([]);
      setOrdersTotal(0);
      return;
    }

    // 防止重复请求
    if (loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    errorShownRef.current = false; // 重置错误标记
    setIsLoadingOrders(true);

    try {
      // 根据当前选中的标签确定状态筛选
      let status: OrderStatusAPI | undefined;
      let statuses: OrderStatusAPI[] | undefined;
      
      if (activeTab === "pending") {
        status = "pending";
      } else if (activeTab === "delivering") {
        status = "shipped";
      } else if (activeTab === "completed") {
        status = "completed";
      } else if (activeTab === "refund") {
        // 退款 tab：查询所有退款相关状态
        statuses = ["refund_requested", "refunded", "refund_rejected"];
      }
      // activeTab === "all" 时不传status参数，获取所有订单

      // API层已经有去重机制，这里不需要额外的loadingRef
      const response = await api.getBuyerOrders({
        page: 1,
        page_size: 20,
        status: status,
        statuses: statuses,
      });

      // 将API订单转换为前端订单格式
      const mappedOrders = response.data.map(mapApiOrderToOrder);
      setOrders(mappedOrders);
      setCurrentPage(1);
      setHasMore(response.data.length >= 20);
      setOrdersTotal(response.total || 0);
      errorShownRef.current = false; // 请求成功，重置错误标记
    } catch (error: any) {
      // 如果是取消的请求，不显示错误
      if (error?.name === "AbortError") {
        loadingRef.current = false;
        return;
      }
      console.error("加载订单失败:", error);
      // 只显示一次错误消息
      if (!errorShownRef.current) {
        errorShownRef.current = true;
        message.error(t("messages.loadFailed"));
      }
      setOrders([]);
      setOrdersTotal(0);
    } finally {
      setIsLoadingOrders(false);
      loadingRef.current = false;
    }
  }, [address, activeTab, t]);

  // 加载订单列表
  useEffect(() => {
    let isMounted = true;

    const fetchOrders = async () => {
      if (isMounted) {
        await loadOrders();
      }
    };

    fetchOrders();

    // 组件卸载时清理
    return () => {
      isMounted = false;
      loadingRef.current = false;
    };
  }, [loadOrders]);

  // 监听路由变化，当从其他页面跳转过来时强制刷新数据
  // 检查 location.state 中是否有 refresh 标志
  const refreshProcessedRef = useRef<string | null>(null);
  useEffect(() => {
    const state = location.state as { refresh?: boolean } | null;
    // 使用 location.key 来唯一标识每次导航，避免重复处理
    const locationKey = location.key || 'default';
    
    if (state?.refresh && address && refreshProcessedRef.current !== locationKey) {
      refreshProcessedRef.current = locationKey;
      // 重置分页状态
      setCurrentPage(1);
      setHasMore(true);
      // 强制刷新数据
      loadOrders();
    }
  }, [location.state, location.key, address, loadOrders]);

  const getStatusButton = (order: Order) => {
    const { status, apiStatus } = order;

    // 根据 apiStatus 显示退款相关状态
    if (apiStatus === "refund_requested") {
      return (
        <Button
          size="small"
          shape="round"
          className="!bg-yellow-500 !border-yellow-500 !text-white px-3"
          icon={<ExclamationCircleOutlined />}
        >
          {t("ordersCenter.status.refundRequested")}
        </Button>
      );
    }

    if (apiStatus === "refunded") {
      return (
        <Button
          size="small"
          shape="round"
          className="!bg-green-500 !border-green-500 !text-white px-3"
          icon={<DollarOutlined />}
        >
          {t("ordersCenter.status.refunded")}
        </Button>
      );
    }

    if (apiStatus === "refund_rejected") {
      return (
        <Button
          size="small"
          shape="round"
          className="!bg-red-500 !border-red-500 !text-white px-3"
          icon={<CloseCircleOutlined />}
        >
          {t("ordersCenter.status.refundRejected")}
        </Button>
      );
    }

    // 其他状态按原逻辑显示
    switch (status) {
      case "completed":
        return (
          <Button
            size="small"
            shape="round"
            className="!bg-purple-500 !border-purple-500 !text-white px-3"
            icon={<CheckCircleOutlined />}
          >
            {t("ordersCenter.tabs.completed")}
          </Button>
        );
      case "delivering":
        return (
          <Button
            size="small"
            shape="round"
            className="!bg-blue-200 !border-blue-200 !text-white px-3"
            icon={<CarOutlined />}
          >
            {t("ordersCenter.tabs.delivering")}
          </Button>
        );
      case "pending":
        return (
          <Button
            size="small"
            shape="round"
            className="!bg-orange-200 !border-orange-200 !text-white px-3"
            icon={<ClockCircleOutlined />}
          >
            {t("ordersCenter.tabs.pending")}
          </Button>
        );
    }
  };

  // 由于API已经根据状态筛选，这里直接使用orders
  // 但为了保险起见，仍然在前端再做一次筛选
  const filteredOrders = orders.filter((order) => {
    if (activeTab === "all") return true;
    if (activeTab === "completed") return order.status === "completed";
    if (activeTab === "delivering") return order.status === "delivering";
    if (activeTab === "pending") return order.status === "pending";
    if (activeTab === "refund") {
      // 退款 tab：筛选所有退款相关状态的订单
      return (
        order.apiStatus === "refund_requested" ||
        order.apiStatus === "refunded" ||
        order.apiStatus === "refund_rejected"
      );
    }
    return true;
  });

  // 处理申请退款
  const handleApplyRefund = async (order: Order) => {
    if (processingOrderId === order.id) {
      return;
    }

    // 检查订单状态，只有在 shipped 状态下才能申请退款
    if (order.apiStatus !== "shipped") {
      message.warning(
        t("messages.refundNotAllowed")
      );
      return;
    }

    setProcessingOrderId(order.id);

    try {
      showLoading(t("loading.processingRefund"));
      const orderId = Number(order.id);
      if (isNaN(orderId)) {
        throw new Error(t("messages.invalidOrderId"));
      }

      await api.applyRefund(orderId);
      hideLoading();
      setProcessingOrderId(null);
      message.success(t("messages.refundApplySuccess"));

      // 重新加载订单列表（强制刷新，清除缓存）
      let refreshStatus: OrderStatusAPI | undefined;
      let refreshStatuses: OrderStatusAPI[] | undefined;
      
      if (activeTab === "pending") {
        refreshStatus = "pending";
      } else if (activeTab === "delivering") {
        refreshStatus = "shipped";
      } else if (activeTab === "completed") {
        refreshStatus = "completed";
      } else if (activeTab === "refund") {
        refreshStatuses = ["refund_requested", "refunded", "refund_rejected"];
      }
      
      await api
        .getBuyerOrders({
          page: 1,
          page_size: 100,
          status: refreshStatus,
          statuses: refreshStatuses,
          force: true, // 强制刷新
        })
        .then((response) => {
          const mappedOrders = response.data.map(mapApiOrderToOrder);
          setOrders(mappedOrders);
          setOrdersTotal(response.total || 0);
        });
    } catch (error: any) {
      console.error("申请退款失败:", error);
      hideLoading();
      setProcessingOrderId(null);
      const errorMessage =
        error?.message ||
        t("messages.refundApplyFailed");
      message.error(errorMessage);
    }
  };

  // 处理确认收货
  const handleConfirmReceived = async (order: Order) => {
    if (processingOrderId === order.id) {
      return;
    }

    if (!isConnected || !address) {
      message.error(t("messages.connectWalletFirst"));
      return;
    }

    // 尝试从订单获取 orderIndex
    // 如果订单有 orderIndex，直接使用；否则尝试将 id 转换为 orderIndex
    let orderIndex: bigint | null = null;

    if (order.orderIndex) {
      orderIndex = order.orderIndex;
    } else if (order.id && !isNaN(Number(order.id))) {
      orderIndex = BigInt(order.id);
    } else {
      message.error(t("messages.invalidOrderIndex"));
      return;
    }

    setProcessingOrderId(order.id);

    try {
      showLoading(t("loading.confirmingReceipt"));
      const receipt = await confirmReceived(orderIndex);

      // 检查交易状态
      if (receipt.status === "success") {
        hideLoading();
        setProcessingOrderId(null);
        message.success(t("messages.confirmSuccess"));
        
        // 等待后端同步合约状态，然后多次刷新确保数据已更新
        const refreshOrders = async () => {
          // 根据当前选中的标签确定状态筛选
          let status: OrderStatusAPI | undefined;
          let statuses: OrderStatusAPI[] | undefined;
          
          if (activeTab === "pending") {
            status = "pending";
          } else if (activeTab === "delivering") {
            status = "shipped";
          } else if (activeTab === "completed") {
            status = "completed";
          } else if (activeTab === "refund") {
            // 退款 tab：查询所有退款相关状态
            statuses = ["refund_requested", "refunded", "refund_rejected"];
          }
          // activeTab === "all" 时不传status参数，获取所有订单

          const response = await api.getBuyerOrders({
            page: 1,
            page_size: 100,
            status: status,
            statuses: statuses,
            force: true, // 强制刷新，清除缓存
          });

          const mappedOrders = response.data.map(mapApiOrderToOrder);
          setOrders(mappedOrders);
          setOrdersTotal(response.total || 0);
        };

        // 立即刷新一次（可能数据还没更新）
        await refreshOrders();

        // 延迟2秒后刷新，给后端时间同步合约状态
        setTimeout(async () => {
          await refreshOrders();
        }, 2000);

        // 再次延迟刷新，确保数据已同步
        setTimeout(async () => {
          await refreshOrders();
        }, 5000);
      } else {
        throw new Error(t("messages.transactionFailed"));
      }
    } catch (error: any) {
      console.error("确认收货失败:", error);
      hideLoading();
      setProcessingOrderId(null);
      const errorMessage =
        error?.message || error?.shortMessage || t("messages.confirmFailed");
      const errorStr = String(errorMessage).toLowerCase();
      if (
        errorStr.includes("rejected") ||
        errorStr.includes("denied") ||
        errorStr.includes("user rejected") ||
        errorStr.includes("user cancelled") ||
        errorStr.includes("user denied")
      ) {
        message.error(t("messages.transactionCancelled"));
      } else {
        message.error(errorMessage);
      }
    }
  };

  const tabs = [
    { key: "all", label: t("ordersCenter.tabs.all") },
    { key: "pending", label: t("ordersCenter.tabs.pending") },
    { key: "delivering", label: t("ordersCenter.tabs.delivering") },
    { key: "completed", label: t("ordersCenter.tabs.completed") },
    { key: "refund", label: t("ordersCenter.tabs.refund") },
  ];

  return (
    <div
      className="min-h-screen pb-20"
      style={{
        backgroundImage: "url(/bg.svg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Fixed Header */}
      <div
        className="fixed top-0 left-0 right-0 z-50 shadow-sm transition-all duration-300"
        style={{
          background: isScrolled ? "rgba(200, 223, 247, 0.8)" : "transparent",
          backdropFilter: isScrolled ? "blur(10px)" : "none",
        }}
      >
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <Title level={5} className="!mb-0">
              {t("ordersCenter.title")}
            </Title>
          </div>
          <Text className="text-sm text-slate-500">
            {t("ordersCenter.total", { count: ordersTotal })}
          </Text>
        </div>
        {/* Fixed Tabs */}
        <div
          className="px-4 pb-3 flex gap-2 overflow-x-auto"
          style={{ background: "transparent" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1 rounded-full text-[12px] whitespace-nowrap transition-colors flex-shrink-0 ${
                activeTab === tab.key
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-[140px]">
        {/* Orders List */}
        <div className="px-4 py-4 space-y-4">
          {isLoadingOrders && filteredOrders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <Text className="text-slate-500">
                {t("loading.defaultMessage")}
              </Text>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <Text className="text-slate-500">
                {t("ordersCenter.noOrders")}
              </Text>
            </div>
          ) : (
            <>
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-lg shadow-sm overflow-hidden"
                >
                  <div className="p-4 space-y-3">
                    {/* Order Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Text className="text-xs text-slate-500 block">
                          {t("ordersCenter.orderNo", { no: order.orderNumber })}
                        </Text>
                        {order.date && (
                          <Text className="text-xs text-slate-400 block mt-1">
                            {order.date}
                          </Text>
                        )}
                      </div>
                      {getStatusButton(order)}
                    </div>

                    {/* Product Info */}
                    <div className="flex gap-3">
                      <img
                        src={`${API_BASE_URL}${order.product_image_url}`}
                        alt={order.product_name || order.name}
                        className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <Text className="text-sm font-medium block mb-1">
                          {order.product_name || order.name}
                        </Text>
                        <Text className="text-xs text-slate-500 block mb-1">
                          {order.store}
                        </Text>
                        <div className="flex items-center justify-between">
                          <Text className="text-base font-semibold text-slate-900">
                            ${order.price}
                          </Text>
                          <Text className="text-xs text-slate-500">
                            x{order.quantity}
                          </Text>
                        </div>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                      <Text className="text-sm text-slate-500">
                        {t("ordersCenter.totalPrice", { amount: order.total })}
                      </Text>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="border-t border-slate-100 p-4">
                    <div className="flex gap-2 justify-end">
                      {/* 查看详情：所有状态都显示 */}
                      <Button
                        type="default"
                        size="small"
                        className="!text-slate-600 !border-slate-300"
                        onClick={() =>
                          navigate(
                            ROUTES.ORDER_DETAIL.replace(":id", order.id),
                            { state: { order } }
                          )
                        }
                      >
                        {t("ordersCenter.viewDetails")}
                      </Button>
                      
                      {/* 申请退款：仅在 shipped 状态时显示 */}
                      {order.apiStatus === "shipped" && (
                        <Button
                          type="default"
                          size="small"
                          danger
                          className="!text-red-600 !border-red-300"
                          onClick={() => handleApplyRefund(order)}
                          loading={processingOrderId === order.id}
                          disabled={processingOrderId !== null}
                        >
                          {t("ordersCenter.applyRefund")}
                        </Button>
                      )}
                      
                      {/* 确认收货：仅在 shipped 状态时显示 */}
                      {order.apiStatus === "shipped" && (
                        <Button
                          type="primary"
                          size="small"
                          className="!bg-slate-900 !border-slate-900"
                          onClick={() => handleConfirmReceived(order)}
                          loading={processingOrderId === order.id}
                          disabled={!isConnected || processingOrderId !== null}
                        >
                          {t("ordersCenter.confirmReceipt")}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Load More Trigger */}
              {hasMore && (
                <div ref={loadMoreRef} className="py-4 text-center">
                  {isLoadingOrders && (
                    <Text className="text-slate-500">
                      {t("loading.loading")}
                    </Text>
                  )}
                </div>
              )}

              {!hasMore && filteredOrders.length > 0 && (
                <div className="py-4 text-center">
                  <Text className="text-slate-500">
                    {t("loading.noMoreProducts")}
                  </Text>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
