import { Typography, Button, message } from "antd";
import { useTranslation } from "react-i18next";
import { CopyOutlined, CarOutlined } from "@ant-design/icons";
import { type Order } from "../orders";
import product from "@/assets/product.png";

const { Text, Title } = Typography;

type OrderDetailPageProps = {
  order: Order;
  onBack?: () => void;
};

export default function OrderDetailPage({
  order,
  onBack,
}: OrderDetailPageProps) {
  const { t } = useTranslation("common");

  const handleCopyOrderNumber = async () => {
    try {
      await navigator.clipboard.writeText(order.orderNumber);
      message.success(t("profile.copy"));
    } catch (err) {
      console.error("复制失败:", err);
      message.error("复制失败");
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
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-20 px-4 py-4">
        {/* Order Details Card */}
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
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
                  aria-label="复制订单号"
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
      </div>
    </div>
  );
}
