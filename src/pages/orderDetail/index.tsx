import { useState } from "react";
import { Typography, Button, message } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useConnection } from "wagmi";
import { CopyOutlined, CarOutlined } from "@ant-design/icons";
import { useMarketContract, useMarketQuery } from "../../hooks/useMarketContract";
import { useGlobalLoading } from "../../contexts/LoadingProvider";
import { type Order } from "../orders";
import { OrderStatus } from "../../lib/contractUtils";
import product from "@/assets/product.png";
import backSvg from "@/assets/back.svg";

const { Text, Title } = Typography;

// 模拟订单数据 - 实际应该从API获取
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

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { address, isConnected } = useConnection();
  const { showLoading, hideLoading } = useGlobalLoading();
  const [isProcessing, setIsProcessing] = useState(false);
  const { confirmReceived, refundOrder } = useMarketContract();
  const { useOrderDetails } = useMarketQuery();

  // 尝试从合约查询订单（如果id是订单索引）
  const orderIndex = id ? (isNaN(Number(id)) ? null : BigInt(id)) : null;
  const { data: contractOrder } = useOrderDetails(orderIndex || 0n, !!orderIndex) as {
    data?: {
      orderId: bigint;
      buyer: string;
      merchant: string;
      amount: bigint;
      price: bigint;
      totalPrice: bigint;
      status: number;
    };
  };

  // 从模拟数据中查找订单，实际应该从API获取
  const mockOrder = mockOrders.find((o) => o.id === id);
  
  // 优先使用合约订单数据，转换为统一格式
  const order: Order & { 
    contractOrder?: {
      orderId: bigint;
      buyer: string;
      merchant: string;
      amount: bigint;
      price: bigint;
      totalPrice: bigint;
      status: number;
    };
  } = contractOrder ? {
    id: id || '',
    orderNumber: `ORD-${orderIndex}`,
    date: new Date().toISOString().split('T')[0],
    status: contractOrder.status === OrderStatus.Pending ? 'pending' 
      : contractOrder.status === OrderStatus.Completed ? 'completed' 
      : 'pending', // 退款状态也显示为pending，因为Order类型中没有refunded
    product: {
      image: product,
      name: t("orderDetail.productPlaceholder"),
      store: t("orderDetail.merchantPlaceholder"),
      price: contractOrder.price.toString(),
      quantity: Number(contractOrder.amount),
    },
    total: contractOrder.totalPrice.toString(),
    paymentAmount: contractOrder.totalPrice.toString(),
    contractOrder: {
      orderId: contractOrder.orderId,
      buyer: contractOrder.buyer,
      merchant: contractOrder.merchant,
      amount: contractOrder.amount,
      price: contractOrder.price,
      totalPrice: contractOrder.totalPrice,
      status: contractOrder.status,
    },
  } : (mockOrder || {
    id: id || '',
    orderNumber: '',
    date: '',
    status: 'pending' as const,
    product: {
      image: product,
      name: '',
      store: '',
      price: '0',
      quantity: 0,
    },
    total: '0',
  });
  
  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Text>{t("orderDetail.orderNotFound")}</Text>
      </div>
    );
  }

  // 处理确认收货
  const handleConfirmReceived = async () => {
    if (isProcessing) {
      return;
    }

    if (!isConnected || !address) {
      message.error(t("messages.connectWalletFirst"));
      return;
    }

    if (!orderIndex) {
      message.error(t("messages.invalidOrderIndex"));
      return;
    }

    setIsProcessing(true);

    try {
      showLoading(t("loading.confirmingReceipt"));
      const receipt = await confirmReceived(orderIndex);
      
      // 检查交易状态
      if (receipt.status === "success") {
        hideLoading();
        setIsProcessing(false);
        message.success(t("messages.confirmSuccess"));
        // 刷新页面或更新订单状态
        window.location.reload();
      } else {
        throw new Error(t("messages.transactionFailed"));
      }
    } catch (error: any) {
      console.error("确认收货失败:", error);
      hideLoading();
      setIsProcessing(false);
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

  // 处理退款
  const handleRefund = async () => {
    if (isProcessing) {
      return;
    }

    if (!isConnected || !address) {
      message.error(t("messages.connectWalletFirst"));
      return;
    }

    if (!orderIndex) {
      message.error(t("messages.invalidOrderIndex"));
      return;
    }

    setIsProcessing(true);

    try {
      showLoading(t("loading.processingRefund"));
      const receipt = await refundOrder(orderIndex);
      
      // 检查交易状态
      if (receipt.status === "success") {
        hideLoading();
        setIsProcessing(false);
        message.success(t("messages.refundSuccess"));
        // 刷新页面或更新订单状态
        window.location.reload();
      } else {
        throw new Error(t("messages.transactionFailed"));
      }
    } catch (error: any) {
      console.error("退款失败:", error);
      hideLoading();
      setIsProcessing(false);
      const errorMessage = error?.message || error?.shortMessage || t("messages.refundFailed");
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

  const handleCopyOrderNumber = async () => {
    try {
      await navigator.clipboard.writeText(order.orderNumber);
      message.success(t("profile.copy"));
    } catch (err) {
      console.error("复制失败:", err);
      message.error(t("messages.copyFailed"));
    }
  };

  const getStatusButton = () => {
    switch (order.status) {
      case "delivering":
        return (
          <Button
            size="small"
            shape="round"
            className="!bg-blue-200 !border-blue-200 !text-white px-3"
            icon={<CarOutlined />}
          >
            {t("orderDetail.shipping")}
          </Button>
        );
      case "completed":
        return (
          <Button
            size="small"
            shape="round"
            className="!bg-slate-900 !border-slate-900 !text-white px-3"
          >
            {t("ordersCenter.tabs.completed")}
          </Button>
        );
      case "pending":
        return (
          <Button
            size="small"
            shape="round"
            className="!bg-orange-200 !border-orange-200 !text-white px-3"
          >
            {t("ordersCenter.tabs.pending")}
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="relative flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={t("ariaLabels.back")}
            className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center z-10"
          >
            <img src={backSvg} alt={t("ariaLabels.back")} className="w-5 h-5" />
          </button>
          <Title level={5} className="!mb-0">
            {t("orderDetail.title")}
          </Title>
        </div>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-20 px-4 py-4">
        {/* Order Details Card */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 space-y-4">
            {/* Order ID and Status Section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Text className="text-sm text-slate-600">
                  {t("orderDetail.orderNo", { no: order.orderNumber })}
                </Text>
                <button
                  type="button"
                  onClick={handleCopyOrderNumber}
                  className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={t("ariaLabels.copyOrderNumber")}
                >
                  <CopyOutlined className="text-xs" />
                </button>
              </div>
              {getStatusButton()}
            </div>

            {/* Product Information Section */}
            <div className="flex gap-3 pt-2">
              <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={order.product.image || product}
                  alt={order.product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <Text className="text-sm font-medium block mb-1 text-slate-900">
                  {order.product.name}
                </Text>
                <div className="flex items-center justify-between mt-2">
                  <Text className="text-base font-semibold text-slate-900">
                    ¥{order.product.price}
                  </Text>
                  <Text className="text-xs text-slate-500">
                    x{order.product.quantity}
                  </Text>
                </div>
              </div>
            </div>

            {/* Payment Amount Section */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Text className="text-sm text-slate-600">
                {t("orderDetail.amount")}
              </Text>
              <Text className="text-base font-semibold text-slate-900">
                ¥{order.paymentAmount || order.total}
              </Text>
            </div>

            {/* Logistics and Time Information Section */}
            {order.logisticsCompany && (
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <Text className="text-sm text-slate-600">
                    {t("orderDetail.logisticsCompany")}
                  </Text>
                  <Text className="text-sm text-slate-900">
                    {order.logisticsCompany}
                  </Text>
                </div>
                {order.logisticsNumber && (
                  <div className="flex items-center justify-between">
                    <Text className="text-sm text-slate-600">
                      {t("orderDetail.logisticsNo")}
                    </Text>
                    <Text className="text-sm text-slate-900">
                      {order.logisticsNumber}
                    </Text>
                  </div>
                )}
                {order.shippingTime && (
                  <div className="flex items-center justify-between">
                    <Text className="text-sm text-slate-600">
                      {t("orderDetail.shipTime")}
                    </Text>
                    <Text className="text-sm text-slate-900">
                      {order.shippingTime}
                    </Text>
                  </div>
                )}
                {order.paymentTime && (
                  <div className="flex items-center justify-between">
                    <Text className="text-sm text-slate-600">
                      {t("orderDetail.payTime")}
                    </Text>
                    <Text className="text-sm text-slate-900">
                      {order.paymentTime}
                    </Text>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 操作按钮区域 */}
        {orderIndex && order.status === 'pending' && order.contractOrder && (
          <div className="mt-4 px-4 space-y-3">
            {order.contractOrder.buyer?.toLowerCase() === address?.toLowerCase() && (
              <Button
                type="primary"
                block
                size="large"
                shape="round"
                className="!bg-slate-900 !border-slate-900"
                onClick={handleConfirmReceived}
                loading={isProcessing}
                disabled={!isConnected}
              >
                {t("orderDetail.confirmReceipt")}
              </Button>
            )}
            {order.contractOrder.merchant?.toLowerCase() === address?.toLowerCase() && (
              <Button
                block
                size="large"
                shape="round"
                danger
                onClick={handleRefund}
                loading={isProcessing}
                disabled={!isConnected}
              >
                {t("orderDetail.refundToBuyer")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
