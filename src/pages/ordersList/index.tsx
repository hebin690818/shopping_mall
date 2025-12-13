import { useState, useEffect, useRef } from "react";
import { Button, Typography, Input, message, Spin } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../routes";
import { CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { type Order, type OrderStatus } from "../orders";
import { api, type OrderAPI, type OrderStatusAPI } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import product from "@/assets/product.png";
import backSvg from "@/assets/back.svg";

const { Text, Title } = Typography;

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

export default function OrdersListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { address } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [logisticsData, setLogisticsData] = useState<
    Record<string, { waybill: string; company: string }>
  >({});
  const loadingRef = useRef(false);
  const errorShownRef = useRef(false);

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "all") return true;
    if (activeTab === "completed") return order.status === "completed";
    if (activeTab === "unfinished") return order.status !== "completed";
    return true;
  });

  const handleLogisticsChange = (
    orderId: string,
    field: "waybill" | "company",
    value: string
  ) => {
    setLogisticsData((prev) => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [field]: value,
      },
    }));
  };

  // 加载订单列表的函数
  useEffect(() => {
    let isMounted = true;

    const loadOrders = async () => {
      if (!address) {
        if (isMounted) {
          setOrders([]);
        }
        return;
      }

      // 防止重复请求
      if (loadingRef.current) {
        return;
      }

      loadingRef.current = true;
      errorShownRef.current = false;

      if (isMounted) {
        setLoading(true);
      }

      try {
        // 根据当前选中的标签确定状态筛选
        let status: OrderStatusAPI | undefined;
        if (activeTab === "completed") {
          status = "completed";
        } else if (activeTab === "unfinished") {
          // 对于未完成，我们可能需要获取pending和shipped状态
          // 但由于API只支持单个status筛选，这里先不传status，然后在前端过滤
          status = undefined;
        }
        // activeTab === "all" 时不传status参数，获取所有订单

        const response = await api.getMerchantOrders({
          merchant_address: address,
          page: 1,
          page_size: 100, // 可以根据需要调整分页
          status: status,
        });

        if (!isMounted) return;

        // 将API订单转换为前端订单格式
        let mappedOrders = response.data.map(mapApiOrderToOrder);

        // 如果选择了unfinished标签，需要过滤出未完成的订单
        if (activeTab === "unfinished") {
          mappedOrders = mappedOrders.filter((order) => order.status !== "completed");
        }

        if (isMounted) {
          setOrders(mappedOrders);
          errorShownRef.current = false;
        }
      } catch (error: any) {
        // 如果是取消的请求，不显示错误
        if (error?.name === 'AbortError') {
          loadingRef.current = false;
          return;
        }
        console.error("加载订单失败:", error);
        // 只在组件仍挂载时显示错误消息，避免重复提示
        if (isMounted && !errorShownRef.current) {
          errorShownRef.current = true;
          message.error(error.message || t("messages.loadFailed") || "加载订单失败");
          setOrders([]);
        }
      } finally {
        loadingRef.current = false;
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOrders();

    // 清理函数
    return () => {
      isMounted = false;
    };
  }, [address, activeTab, t]);

  // 标签切换时滚动到顶部
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  const handleUpload = (orderId: string) => {
    const data = logisticsData[orderId];
    if (!data?.waybill || !data?.company) {
      message.warning(t("messages.fillLogisticsInfo"));
      return;
    }
    message.success(t("messages.uploadSuccess"));
    // 这里可以添加实际上传逻辑
  };

  const getStatusButton = (status: Order["status"]) => {
    if (status === "completed") {
      return (
        <Button
          size="small"
          shape="round"
          className="!bg-slate-900 !border-slate-900 !text-white px-3"
          icon={<CheckCircleOutlined />}
        >
          {t("ordersCenter.statusCompleted")}
        </Button>
      );
    } else {
      return (
        <Button
          size="small"
          shape="round"
          className="!bg-slate-100 !border-slate-200 !text-slate-600 px-3"
          icon={<ClockCircleOutlined />}
        >
          {t("ordersCenter.statusUnfinished")}
        </Button>
      );
    }
  };

  const tabs = [
    { key: "all", label: t("ordersCenter.tabs.all") },
    { key: "completed", label: t("ordersCenter.tabs.completed") },
    { key: "unfinished", label: t("ordersCenter.tabs.unfinished") },
  ];

  return (
    <div className="min-h-screen pb-20">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="relative flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => navigate(ROUTES.PROFILE)}
            aria-label={t("ariaLabels.back")}
            className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center z-10"
          >
            <img src={backSvg} alt={t("ariaLabels.back")} className="w-5 h-5" />
          </button>
          <Title level={5} className="!mb-0">
            {t("orderDetail.title")}
          </Title>
        </div>
        {/* Fixed Tabs */}
        <div
          className="px-4 pb-3 flex gap-2"
          style={{ background: "transparent" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors flex-shrink-0 ${
                activeTab === tab.key
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-[120px]">

        {/* Orders List */}
        <div className="px-4 py-4 space-y-4">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Spin size="large" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex justify-center items-center py-20">
              <Text className="text-slate-400">{t("ordersCenter.noOrders")}</Text>
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

                {/* Total and view details */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Text className="text-sm text-slate-500">
                    {t("ordersCenter.totalPrice", { amount: order.total })}
                  </Text>
                  {order.status === "completed" && (
                    <button
                      type="button"
                      className="text-xs text-slate-500 flex items-center gap-1"
                      onClick={() => navigate(ROUTES.ORDER_DETAIL.replace(':id', order.id))}
                    >
                      {t("ordersCenter.viewDetails")}
                      <span className="text-slate-400">›</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Upload Logistics Section for Unfinished Orders */}
              {order.status !== "completed" && (
                <div className="border-t border-slate-100 px-4 py-4 space-y-3">
                  <Text className="text-xs text-slate-500 block">
                    {t("ordersCenter.uploadLogisticsTitle")}
                  </Text>
                  <Input
                    size="large"
                    placeholder={t("ordersCenter.waybillPlaceholder")}
                    className="!rounded-2xl !bg-slate-50 !border-slate-200"
                    value={logisticsData[order.id]?.waybill || ""}
                    onChange={(e) =>
                      handleLogisticsChange(order.id, "waybill", e.target.value)
                    }
                  />
                  <Input
                    size="large"
                    placeholder={t("ordersCenter.companyPlaceholder")}
                    className="!rounded-2xl !bg-slate-50 !border-slate-200"
                    value={logisticsData[order.id]?.company || ""}
                    onChange={(e) =>
                      handleLogisticsChange(order.id, "company", e.target.value)
                    }
                  />
                  <Button
                    type="primary"
                    block
                    shape="round"
                    className="!bg-slate-900 !border-slate-900 h-11"
                    onClick={() => handleUpload(order.id)}
                  >
                    {t("ordersCenter.upload")}
                  </Button>
                </div>
              )}
            </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
