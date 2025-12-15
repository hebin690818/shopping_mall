import { useState } from "react";
import { Typography, Button, message, Modal } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useConnection } from "wagmi";
import { 
  CopyOutlined, 
  CarOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  DollarOutlined
} from "@ant-design/icons";
import { useMarketContract, useMarketQuery } from "@/hooks/useMarketContract";
import { useGlobalLoading } from "@/contexts/LoadingProvider";
import { type Order } from "../orders";
import { OrderStatus } from "@/lib/contractUtils";
import { ROUTES } from "@/routes";
import product from "@/assets/product.png";
import backSvg from "@/assets/back.svg";
import { API_BASE_URL_IMAGE } from "@/lib/config";

const { Text, Title } = Typography;

// 模拟订单数据 - 实际应该从API获取
const mockOrders: Order[] = [
  {
    id: "1",
    orderNumber: "ORD-2024-001",
    date: "2024-11-20",
    status: "completed",
      image: product,
      name: "无线蓝牙耳机 Pro",
      store: "科技数码旗舰店",
      price: "299.99",
      quantity: 1,
    total: "299.99",
    paymentAmount: "299.99",
    tracking_number: "12345667890890890",
    updated_at: "2025-05-05",
    created_at: "2025-05-05",
  },
  {
    id: "2",
    orderNumber: "ORD-2024-002",
    date: "2024-11-22",
    status: "delivering",
      image: product,
      name: "智能运动手环",
      store: "科技数码旗舰店",
      price: "299.99",
      quantity: 1,
    total: "299.99",
    paymentAmount: "123.00",
    tracking_number: "12345667890890890",
    updated_at: "2025-05-05",
    created_at: "2025-05-05",
  },
  {
    id: "3",
    orderNumber: "ORD-2024-003",
    date: "2024-11-24",
    status: "pending",
      image: product,
      name: "便携式蓝牙音箱",
      store: "科技数码旗舰店",
      price: "299.99",
      quantity: 1,
    total: "299.99",
  },
];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation("common");
  const { address, isConnected } = useConnection();
  const { showLoading, hideLoading } = useGlobalLoading();
  const [isProcessing, setIsProcessing] = useState(false);
  const { confirmReceived, refundOrder } = useMarketContract();
  const { useOrderDetails } = useMarketQuery();

  // 优先从上一页传递的 state 中获取订单数据
  const stateOrder = (location.state as { order?: Order })?.order;

  // 确定订单索引：优先使用 state 中的 orderIndex，否则尝试从 id 解析
  const orderIndex = stateOrder?.orderIndex 
    ? stateOrder.orderIndex 
    : (id && !isNaN(Number(id)) ? BigInt(id) : null);

  // 如果 state 中没有订单数据，尝试从合约查询订单（如果 orderIndex 存在）
  const { data: contractOrder } = useOrderDetails(
    orderIndex || 0n, 
    !!orderIndex && !stateOrder
  ) as {
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

  // 从模拟数据中查找订单（作为最后的回退方案）
  const mockOrder = !stateOrder && !contractOrder 
    ? mockOrders.find((o) => o.id === id) 
    : null;
  
  // 构建订单数据：优先级为 stateOrder > contractOrder > mockOrder > 默认值
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
  } = stateOrder ? {
    ...stateOrder,
    // 如果 stateOrder 有 orderIndex，尝试获取合约数据以补充 contractOrder 信息
    ...(orderIndex && contractOrder ? {
      contractOrder: {
        orderId: contractOrder.orderId,
        buyer: contractOrder.buyer,
        merchant: contractOrder.merchant,
        amount: contractOrder.amount,
        price: contractOrder.price,
        totalPrice: contractOrder.totalPrice,
        status: contractOrder.status,
      },
    } : {}),
  } : contractOrder ? {
    id: id || '',
    orderNumber: `ORD-${orderIndex}`,
    date: new Date().toISOString().split('T')[0],
    status: contractOrder.status === OrderStatus.Pending ? 'pending' 
      : contractOrder.status === OrderStatus.Completed ? 'completed' 
      : 'pending', // 退款状态也显示为pending，因为Order类型中没有refunded
    image: product,
    name: t("orderDetail.productPlaceholder"),
    store: t("orderDetail.merchantPlaceholder"),
    price: contractOrder.price.toString(),
    quantity: Number(contractOrder.amount),
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
    image: product,
    name: '',
    store: '',
    price: '0',
    quantity: 0,
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
        
        // 导航回订单列表并传递刷新标志
        navigate(ROUTES.ORDERS, { 
          state: { refresh: true },
          replace: false 
        });
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

  // 执行退款操作
  const executeRefund = async () => {
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

  // 处理退款（带二次确认）
  const handleRefund = () => {
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

    Modal.confirm({
      title: t("orderDetail.refundToBuyer"),
      content: t("orderDetail.confirmRefundMessage"),
      okText: t("common.confirm"),
      cancelText: t("common.back"),
      onOk: executeRefund,
      okButtonProps: {
        danger: true,
      },
    });
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

  // 获取订单状态显示信息（与 orders 页面保持一致）
  const getOrderStatusInfo = () => {
    const { status, apiStatus } = order;
    
    // 优先检查 API 状态中的退款相关状态（与 orders 页面逻辑一致）
    if (apiStatus === "refund_requested") {
      return {
        text: t("ordersCenter.status.refundRequested"),
        className: "!bg-yellow-500 !border-yellow-500 !text-white",
        icon: <ExclamationCircleOutlined />,
      };
    }

    if (apiStatus === "refunded") {
      return {
        text: t("ordersCenter.status.refunded"),
        className: "!bg-green-500 !border-green-500 !text-white",
        icon: <DollarOutlined />,
      };
    }

    if (apiStatus === "refund_rejected") {
      return {
        text: t("ordersCenter.status.refundRejected"),
        className: "!bg-red-500 !border-red-500 !text-white",
        icon: <CloseCircleOutlined />,
      };
    }

    // 检查合约状态（如果存在且没有 API 状态）
    const contractStatus = order.contractOrder?.status;
    if (contractStatus === OrderStatus.Refunded && !apiStatus) {
      return {
        text: t("ordersCenter.status.refunded"),
        className: "!bg-green-500 !border-green-500 !text-white",
        icon: <DollarOutlined />,
      };
    }
    
    // 根据前端状态显示（与 orders 页面样式保持一致）
    switch (status) {
      case "completed":
        return {
          text: t("ordersCenter.tabs.completed"),
          className: "!bg-purple-500 !border-purple-500 !text-white",
          icon: <CheckCircleOutlined />,
        };
      case "delivering":
        return {
          text: t("orderDetail.shipping") || t("ordersCenter.tabs.delivering"),
          className: "!bg-blue-200 !border-blue-200 !text-white",
          icon: <CarOutlined />,
        };
      case "pending":
        return {
          text: t("ordersCenter.tabs.pending"),
          className: "!bg-orange-200 !border-orange-200 !text-white",
          icon: <ClockCircleOutlined />,
        };
      default:
        return {
          text: t("ordersCenter.tabs.pending"),
          className: "!bg-orange-200 !border-orange-200 !text-white",
          icon: <ClockCircleOutlined />,
        };
    }
  };

  const getStatusButton = () => {
    const statusInfo = getOrderStatusInfo();
    
    return (
      <Button
        size="small"
        shape="round"
        className={`${statusInfo.className} px-3`}
        icon={statusInfo.icon}
        disabled
      >
        {statusInfo.text}
      </Button>
    );
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
                  src={`${API_BASE_URL_IMAGE}${order.product_image_url}`}
                  alt={order.product_name || order.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <Text className="text-sm font-medium block mb-1 text-slate-900">
                  {order.product_name || order.name}
                </Text>
                <div className="flex items-center justify-between mt-2">
                  <Text className="text-base font-semibold text-slate-900">
                    ${order.price}
                  </Text>
                  <Text className="text-xs text-slate-500">
                    x{order.quantity}
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
                ${order.paymentAmount || order.total}
              </Text>
            </div>

            {/* Logistics and Time Information Section */}
            {(order.tracking_number || order.updated_at || order.created_at || order.refund_rejection_reason) && (
              <div className="space-y-3 pt-3 border-t border-slate-100">
                {order.tracking_number && (
                  <div className="flex items-center justify-between">
                    <Text className="text-sm text-slate-600">
                      {t("orderDetail.logisticsNo")}
                    </Text>
                    <Text className="text-sm text-slate-900">
                      {order.tracking_number}
                    </Text>
                  </div>
                )}
                {order.updated_at && (
                  <div className="flex items-center justify-between">
                    <Text className="text-sm text-slate-600">
                      {t("orderDetail.updateTime")}
                    </Text>
                    <Text className="text-sm text-slate-900">
                      {order.updated_at.includes('T') 
                        ? order.updated_at.split('T')[0] 
                        : order.updated_at}
                    </Text>
                  </div>
                )}
                {order.created_at && (
                  <div className="flex items-center justify-between">
                    <Text className="text-sm text-slate-600">
                      {t("orderDetail.payTime")}
                    </Text>
                    <Text className="text-sm text-slate-900">
                      {order.created_at.includes('T') 
                        ? order.created_at.split('T')[0] 
                        : order.created_at}
                    </Text>
                  </div>
                )}
                {order.refund_rejection_reason && (
                  <div className="flex items-start justify-between">
                    <Text className="text-sm text-slate-600 flex-shrink-0">
                      {t("orderDetail.refundRejectionReason")}
                    </Text>
                    <Text className="text-sm text-slate-900 flex-1 text-right ml-4">
                      {order.refund_rejection_reason}
                    </Text>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 操作按钮区域 */}
        {orderIndex && order.contractOrder && (
          <div className="mt-4 px-4 space-y-3">
            {/* 买家确认收货按钮 - 仅当订单状态为 pending 时显示 */}
            {order.status === 'pending' && 
             order.contractOrder.buyer?.toLowerCase() === address?.toLowerCase() && (
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
            {/* 商家退款按钮 - 仅当订单状态为 pending 时显示 */}
            {order.status === 'pending' && 
             order.contractOrder.merchant?.toLowerCase() === address?.toLowerCase() && (
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
