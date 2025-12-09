import { useState, useEffect } from "react";
import { Button, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../routes";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CarOutlined,
} from "@ant-design/icons";
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
};

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
    orderNumber: "ORD-2024-002",
    date: "2024-11-22",
    status: "delivering",
    product: {
      image: product,
      name: "智能运动手环",
      store: "科技数码旗舰店",
      price: "299.99",
      quantity: 1,
    },
    total: "299.99",
    paymentAmount: "123.00",
    logisticsCompany: "韵达快递",
    logisticsNumber: "12345667890890890",
    shippingTime: "2025-05-05",
    paymentTime: "2025-05-05",
  },
  {
    id: "3",
    orderNumber: "ORD-2024-003",
    date: "2024-11-24",
    status: "pending",
    product: {
      image: product,
      name: "便携式蓝牙音箱",
      store: "科技数码旗舰店",
      price: "299.99",
      quantity: 1,
    },
    total: "299.99",
  },
];

export default function OrdersPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isScrolled, setIsScrolled] = useState(false);

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

  const filteredOrders = mockOrders.filter((order) => {
    if (activeTab === "all") return true;
    if (activeTab === "completed") return order.status === "completed";
    if (activeTab === "delivering") return order.status === "delivering";
    if (activeTab === "pending") return order.status === "pending";
    return true;
  });

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
            <Title level={4} className="!mb-0">
              {t("ordersCenter.title")}
            </Title>
          </div>
          <Text className="text-sm text-slate-500">
            {t("ordersCenter.total", { count: mockOrders.length })}
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
          ))}
        </div>
      </div>
    </div>
  );
}
