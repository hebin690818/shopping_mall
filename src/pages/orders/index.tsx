import { useState, useEffect, useCallback, useRef } from "react";
import { Button, Typography, message } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useConnection } from "wagmi";
import { ROUTES } from "../../routes";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CarOutlined,
} from "@ant-design/icons";
import { useMarketContract, useMarketQuery } from "../../hooks/useMarketContract";
import { useGlobalLoading } from "../../contexts/LoadingProvider";
import { api, type OrderAPI, type OrderStatusAPI } from "../../lib/api";
import product from "@/assets/product.png";

const { Text, Title } = Typography;

export type OrderStatus = "pending" | "delivering" | "completed";

export type Order = {
  id: string;
  orderNumber: string;
  date: string;
  status: OrderStatus;
  product: {
    image: string;
    name: string;
    store: string;
    price: string;
    quantity: number;
  };
  total: string;
  paymentAmount?: string;
  logisticsCompany?: string;
  logisticsNumber?: string;
  shippingTime?: string;
  paymentTime?: string;
  orderIndex?: bigint; // 合约订单索引
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
    case "refunded":
      // 退款相关状态可以显示为已完成，或者可以添加新的状态
      return "completed";
    default:
      return "pending";
  }
};

// 将API订单数据转换为前端订单格式
const mapApiOrderToOrder = (apiOrder: OrderAPI): Order => {
  const productData = apiOrder.product || {};
  
  return {
    id: String(apiOrder.id || ""),
    orderNumber: apiOrder.order_number || apiOrder.orderNumber || `ORD-${apiOrder.id}`,
    date: apiOrder.date || apiOrder.created_at?.split("T")[0] || "",
    status: mapApiStatusToOrderStatus(apiOrder.status),
    product: {
      image: productData.image || productData.image_url || product,
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
        ? (typeof apiOrder.orderIndex === "string" ? BigInt(apiOrder.orderIndex) : BigInt(apiOrder.orderIndex))
        : undefined,
  };
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { address, isConnected } = useConnection();
  const { confirmReceived } = useMarketContract();
  const { showLoading, hideLoading } = useGlobalLoading();
  const { useOrderCount } = useMarketQuery();
  const { data: orderCount } = useOrderCount();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isScrolled, setIsScrolled] = useState(false);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // 监听滚动，为固定头部添加背景色
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      if (activeTab === "pending") {
        status = "pending";
      } else if (activeTab === "delivering") {
        status = "shipped";
      } else if (activeTab === "completed") {
        status = "completed";
      }
      // activeTab === "all" 时不传status参数，获取所有订单

      // API层已经有去重机制，这里不需要额外的loadingRef
      const response = await api.getBuyerOrders({
        buyer_address: address,
        page: 1,
        page_size: 100, // 可以根据需要调整分页
        status: status,
      });

      // 将API订单转换为前端订单格式
      const mappedOrders = response.data.map(mapApiOrderToOrder);
      setOrders(mappedOrders);
      errorShownRef.current = false; // 请求成功，重置错误标记
    } catch (error: any) {
      // 如果是取消的请求，不显示错误
      if (error?.name === 'AbortError') {
        loadingRef.current = false;
        return;
      }
      console.error("加载订单失败:", error);
      // 只显示一次错误消息
      if (!errorShownRef.current) {
        errorShownRef.current = true;
        message.error(t("messages.loadFailed") || "加载订单失败");
      }
      setOrders([]);
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

  const getStatusButton = (status: OrderStatus) => {
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
    return true;
  });

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
        // 重新加载订单列表（强制刷新，清除缓存）
        await api.getBuyerOrders({
          buyer_address: address!,
          page: 1,
          page_size: 100,
          status: activeTab === "pending" ? "pending" 
            : activeTab === "delivering" ? "shipped"
            : activeTab === "completed" ? "completed"
            : undefined,
          force: true, // 强制刷新
        }).then((response) => {
          const mappedOrders = response.data.map(mapApiOrderToOrder);
          setOrders(mappedOrders);
        });
      } else {
        throw new Error(t("messages.transactionFailed"));
      }
    } catch (error: any) {
      console.error("确认收货失败:", error);
      hideLoading();
      setProcessingOrderId(null);
      const errorMessage = error?.message || error?.shortMessage || t("messages.confirmFailed");
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
            {t("ordersCenter.total", { count: orderCount ? Number(orderCount) : 0 })}
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
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors flex-shrink-0 ${
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
          {isLoadingOrders ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <Text className="text-slate-500">{t("loading.defaultMessage") || "加载中..."}</Text>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <Text className="text-slate-500">{t("ordersCenter.noOrders") || "暂无订单"}</Text>
            </div>
          ) : (
            filteredOrders.map((order) => (
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
                  {getStatusButton(order.status)}
                </div>

                {/* Product Info */}
                <div className="flex gap-3">
                  <img
                    src={order.product.image}
                    alt={order.product.name}
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <Text className="text-sm font-medium block mb-1">
                      {order.product.name}
                    </Text>
                    <Text className="text-xs text-slate-500 block mb-1">
                      {order.product.store}
                    </Text>
                    <div className="flex items-center justify-between">
                      <Text className="text-base font-semibold text-slate-900">
                        ¥{order.product.price}
                      </Text>
                      <Text className="text-xs text-slate-500">
                        x{order.product.quantity}
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
                {order.status === "completed" && (
                  <div className="flex justify-end">
                    <Button
                      type="default"
                      size="small"
                      className="!text-slate-600 !border-slate-300"
                      onClick={() => navigate(ROUTES.ORDER_DETAIL.replace(':id', order.id))}
                    >
                      {t("ordersCenter.viewDetails")}
                    </Button>
                  </div>
                )}
                {order.status === "delivering" && (
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="default"
                      size="small"
                      className="!text-slate-600 !border-slate-300"
                      onClick={() => navigate(ROUTES.ORDER_DETAIL.replace(':id', order.id))}
                    >
                      {t("ordersCenter.viewDetails")}
                    </Button>
                    <Button
                      type="default"
                      size="small"
                      className="!text-slate-600 !border-slate-300"
                    >
                      {t("ordersCenter.viewLogistics")}
                    </Button>
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
                  </div>
                )}
                {order.status === "pending" && (
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="default"
                      size="small"
                      className="!text-slate-600 !border-slate-300"
                    >
                      {t("ordersCenter.cancelOrder")}
                    </Button>
                    <Button
                      type="primary"
                      size="small"
                      className="!bg-slate-900 !border-slate-900"
                    >
                      {t("ordersCenter.payNow")}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
