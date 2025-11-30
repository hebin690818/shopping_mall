import { useState, useEffect } from "react";
import { Button, Typography, Input, message } from "antd";
import { useTranslation } from "react-i18next";
import { CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { type Order } from "../orders";
import product from "@/assets/product.png";

const { Text, Title } = Typography;

const mockOrders: Order[] = [
  {
    id: "1",
    orderNumber: "ORD-2024-001",
    date: "2024-11-20",
    status: "completed",
    product: {
      image: product,
      name: "无线蓝牙耳机 Pro",
      store: "科技数码旗舰店",
      price: "299.99",
      quantity: 1,
    },
    total: "299.99",
    paymentAmount: "299.99",
    logisticsCompany: "韵达快递",
    logisticsNumber: "12345667890890890",
    shippingTime: "2025-05-05",
    paymentTime: "2025-05-05",
  },
  {
    id: "2",
    orderNumber: "ORD-2024-001",
    date: "2024-11-20",
    status: "pending",
    product: {
      image: product,
      name: "无线蓝牙耳机 Pro",
      store: "科技数码旗舰店",
      price: "299.99",
      quantity: 1,
    },
    total: "299.99",
  },
];

type OrdersListPageProps = {
  onBack?: () => void;
  onViewDetails?: (order: Order) => void;
};

export default function OrdersListPage({
  onBack,
  onViewDetails,
}: OrdersListPageProps) {
  const { t } = useTranslation("common");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [logisticsData, setLogisticsData] = useState<
    Record<string, { waybill: string; company: string }>
  >({});

  const filteredOrders = mockOrders.filter((order) => {
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

  // 标签切换时滚动到顶部
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  const handleUpload = (orderId: string) => {
    const data = logisticsData[orderId];
    if (!data?.waybill || !data?.company) {
      message.warning("请填写完整的物流信息");
      return;
    }
    message.success("上传成功");
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
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="返回"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-700 text-xl"
            >
              ←
            </button>
          )}
          <Title level={4} className="!mb-0">
            {t("orderDetail.title")}
          </Title>
        </div>
        {/* Fixed Tabs */}
        <div
          className="px-4 py-3 flex gap-2"
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
      <div className="pt-[140px]">

        {/* Orders List */}
        <div className="px-4 py-4 space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-3xl shadow-sm overflow-hidden"
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
                      onClick={() => onViewDetails?.(order)}
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
          ))}
        </div>
      </div>
    </div>
  );
}
