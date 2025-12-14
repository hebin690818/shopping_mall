import { useState, useEffect, useRef } from "react";
import { Button, Typography, Input, message, Spin, Modal } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../routes";
import { CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { type Order } from "../orders";
import { useAuth } from "@/hooks/useAuth";
import { useMerchantOrders } from "@/hooks/useMerchantOrders";
import { api } from "@/lib/api";
import backSvg from "@/assets/back.svg";

const { Text, Title } = Typography;

export default function OrdersListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { address } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [logisticsData, setLogisticsData] = useState<
    Record<string, { waybill: string; company: string }>
  >({});
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // 退款相关状态
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [currentRefundOrder, setCurrentRefundOrder] = useState<Order | null>(null);
  const [processingRefund, setProcessingRefund] = useState(false);

  // 使用自定义 hook 管理订单数据
  const {
    orders,
    loading,
    hasMore,
    loadMore: loadMoreOrders,
    refresh: refreshOrders,
  } = useMerchantOrders({
    activeTab,
    pageSize: 20,
    enabled: !!address,
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

  // 使用 Intersection Observer 实现滚动加载
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (!hasMore || loading) {
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
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
  }, [hasMore, loading, loadMoreOrders]);

  // 标签切换时滚动到顶部
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  const handleUpload = async (orderId: string) => {
    const data = logisticsData[orderId];
    if (!data?.waybill) {
      message.warning(t("messages.fillLogisticsInfo"));
      return;
    }

    if (!address) {
      message.warning(t("messages.connectWalletFirst"));
      return;
    }

    try {
      // 将 orderId 转换为数字
      const orderIdNum = parseInt(orderId, 10);
      if (isNaN(orderIdNum)) {
        message.error(t("messages.invalidOrderId"));
        return;
      }

      // 调用发货接口
      await api.shipOrder({
        merchant_address: address,
        order_id: orderIdNum,
        tracking_number: data.waybill,
      });

      message.success(t("messages.uploadSuccess"));
      
      // 清空该订单的物流数据
      setLogisticsData((prev) => {
        const newData = { ...prev };
        delete newData[orderId];
        return newData;
      });

      // 刷新订单列表
      if (refreshOrders) {
        refreshOrders();
      }
    } catch (error: any) {
      message.error(error?.message || t("messages.loadFailed") || "上传失败，请重试");
    }
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

  // 处理同意退款
  const handleApproveRefund = async () => {
    if (!currentRefundOrder || processingRefund) return;

    setProcessingRefund(true);
    try {
      const orderId = parseInt(currentRefundOrder.id, 10);
      if (isNaN(orderId)) {
        message.error(t("messages.invalidOrderId"));
        return;
      }

      await api.approveRefund(orderId);
      message.success(t("messages.refundSuccess") || "同意退款成功");
      setApproveModalVisible(false);
      setCurrentRefundOrder(null);
      
      // 刷新订单列表
      if (refreshOrders) {
        refreshOrders();
      }
    } catch (error: any) {
      message.error(error?.message || t("messages.refundFailed") || "同意退款失败，请重试");
    } finally {
      setProcessingRefund(false);
    }
  };

  // 处理拒绝退款
  const handleRejectRefund = async () => {
    if (!currentRefundOrder || processingRefund) return;

    if (!rejectReason.trim()) {
      message.warning(t("ordersCenter.rejectReasonRequired") || "请输入拒绝理由");
      return;
    }

    setProcessingRefund(true);
    try {
      const orderId = parseInt(currentRefundOrder.id, 10);
      if (isNaN(orderId)) {
        message.error(t("messages.invalidOrderId"));
        return;
      }

      await api.rejectRefund(orderId, rejectReason.trim());
      message.success(t("ordersCenter.rejectRefundSuccess") || "拒绝退款成功");
      setRejectModalVisible(false);
      setRejectReason("");
      setCurrentRefundOrder(null);
      
      // 刷新订单列表
      if (refreshOrders) {
        refreshOrders();
      }
    } catch (error: any) {
      message.error(error?.message || t("ordersCenter.rejectRefundFailed") || "拒绝退款失败，请重试");
    } finally {
      setProcessingRefund(false);
    }
  };

  // 打开同意退款对话框
  const openApproveModal = (order: Order) => {
    setCurrentRefundOrder(order);
    setApproveModalVisible(true);
  };

  // 打开拒绝退款对话框
  const openRejectModal = (order: Order) => {
    setCurrentRefundOrder(order);
    setRejectReason("");
    setRejectModalVisible(true);
  };

  // 获取退款状态显示
  const getRefundStatusDisplay = (order: Order) => {
    if (order.apiStatus === "refund_requested") {
      return {
        text: t("ordersCenter.refundStatusPending") || "待处理",
        color: "text-slate-600",
        icon: <ClockCircleOutlined />,
      };
    } else if (order.apiStatus === "refunded") {
      return {
        text: t("ordersCenter.refundStatusRefunded") || "已退款",
        color: "text-green-600",
        icon: <CheckCircleOutlined />,
      };
    }
    return null;
  };

  const tabs = [
    { key: "all", label: t("ordersCenter.tabs.all") },
    { key: "completed", label: t("ordersCenter.tabs.completed") },
    { key: "unfinished", label: t("ordersCenter.tabs.unfinished") },
    { key: "pending", label: t("ordersCenter.tabs.pending") || "待处理" },
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
          {loading && orders.length === 0 ? (
            <div className="flex justify-center items-center py-20">
              <Spin size="large" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex justify-center items-center py-20">
              <Text className="text-slate-400">
                {t("ordersCenter.noOrders")}
              </Text>
            </div>
          ) : (
            <>
              {orders.map((order) => {
                const refundStatus = getRefundStatusDisplay(order);
                const isRefundRequested = order.apiStatus === "refund_requested";
                const isRefunded = order.apiStatus === "refunded";
                
                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-lg shadow-sm overflow-hidden"
                  >
                  {/* 退款请求标题 */}
                  {(isRefundRequested || isRefunded) && (
                    <div className="px-4 pt-4 pb-2">
                      <Text className="text-sm font-medium text-slate-900">
                        {t("ordersCenter.buyerRefundRequest") || "买家申请退款"}
                      </Text>
                    </div>
                  )}
                  
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
                      {refundStatus ? (
                        <Button
                          size="small"
                          shape="round"
                          className={`!bg-slate-100 !border-slate-200 ${refundStatus.color} px-3`}
                          icon={refundStatus.icon}
                        >
                          {refundStatus.text}
                        </Button>
                      ) : (
                        getStatusButton(order.status)
                      )}
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
                      {order.status === "completed" && !isRefundRequested && !isRefunded && (
                        <button
                          type="button"
                          className="text-xs text-slate-500 flex items-center gap-1"
                          onClick={() =>
                            navigate(
                              ROUTES.ORDER_DETAIL.replace(":id", order.id)
                            )
                          }
                        >
                          {t("ordersCenter.viewDetails")}
                          <span className="text-slate-400">›</span>
                        </button>
                      )}
                      {(isRefundRequested || isRefunded) && (
                        <button
                          type="button"
                          className="text-xs text-slate-500 flex items-center gap-1"
                          onClick={() =>
                            navigate(
                              ROUTES.ORDER_DETAIL.replace(":id", order.id)
                            )
                          }
                        >
                          {t("ordersCenter.viewDetails")}
                          <span className="text-slate-400">›</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 退款请求操作按钮 */}
                  {isRefundRequested && (
                    <div className="border-t border-slate-100 px-4 py-4 space-y-3">
                      <div className="flex gap-3">
                        <Button
                          block
                          shape="round"
                          className="!bg-white !border-slate-900 !text-slate-900 h-11"
                          onClick={() => openRejectModal(order)}
                          disabled={processingRefund}
                        >
                          {t("ordersCenter.reject") || "拒绝"}
                        </Button>
                        <Button
                          type="primary"
                          block
                          shape="round"
                          className="!bg-slate-900 !border-slate-900 h-11"
                          onClick={() => openApproveModal(order)}
                          disabled={processingRefund}
                        >
                          {t("ordersCenter.approve") || "同意"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Upload Logistics Section for Unfinished Orders */}
                  {order.status !== "completed" && !isRefundRequested && !isRefunded && (
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
                          handleLogisticsChange(
                            order.id,
                            "waybill",
                            e.target.value
                          )
                        }
                      />
                      {/* <Input
                        size="large"
                        placeholder={t("ordersCenter.companyPlaceholder")}
                        className="!rounded-2xl !bg-slate-50 !border-slate-200"
                        value={logisticsData[order.id]?.company || ""}
                        onChange={(e) =>
                          handleLogisticsChange(
                            order.id,
                            "company",
                            e.target.value
                          )
                        }
                      /> */}
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
                );
              })}

              {/* Load More Trigger */}
              {hasMore && (
                <div ref={loadMoreRef} className="py-4 text-center">
                  {loading && (
                    <Text className="text-slate-500">
                      {t("loading.loading")}
                    </Text>
                  )}
                </div>
              )}

              {!hasMore && orders.length > 0 && (
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

      {/* 同意退款确认对话框 */}
      <Modal
        open={approveModalVisible}
        onCancel={() => {
          setApproveModalVisible(false);
          setCurrentRefundOrder(null);
        }}
        footer={null}
        className="refund-modal"
        width="90%"
        style={{ maxWidth: "400px" }}
      >
        {currentRefundOrder && (
          <div className="space-y-4">
            <div>
              <Text className="text-xs text-slate-500 block">
                {t("ordersCenter.orderNo", { no: currentRefundOrder.orderNumber })}
              </Text>
              {currentRefundOrder.date && (
                <Text className="text-xs text-slate-400 block mt-1">
                  {currentRefundOrder.date}
                </Text>
              )}
            </div>
            
            {/* 产品信息 */}
            <div className="flex gap-3 bg-slate-50 rounded-lg p-3">
              <img
                src={currentRefundOrder.product.image}
                alt={currentRefundOrder.product.name}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <Text className="text-sm font-medium block mb-1">
                  {currentRefundOrder.product.name}
                </Text>
                <Text className="text-xs text-slate-500 block mb-1">
                  {currentRefundOrder.product.store}
                </Text>
                <div className="flex items-center justify-between">
                  <Text className="text-base font-semibold text-slate-900">
                    ¥{currentRefundOrder.product.price}
                  </Text>
                  <Text className="text-xs text-slate-500">
                    x{currentRefundOrder.product.quantity}
                  </Text>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                block
                shape="round"
                className="!bg-white !border-slate-900 !text-slate-900 h-11"
                onClick={() => {
                  setApproveModalVisible(false);
                  setCurrentRefundOrder(null);
                }}
                disabled={processingRefund}
              >
                {t("common.back") || "返回"}
              </Button>
              <Button
                type="primary"
                block
                shape="round"
                className="!bg-slate-900 !border-slate-900 h-11"
                onClick={handleApproveRefund}
                loading={processingRefund}
              >
                {t("ordersCenter.approveRefund") || "同意退款"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 拒绝退款对话框 */}
      <Modal
        open={rejectModalVisible}
        onCancel={() => {
          setRejectModalVisible(false);
          setRejectReason("");
          setCurrentRefundOrder(null);
        }}
        footer={null}
        className="refund-modal"
        width="90%"
        style={{ maxWidth: "400px" }}
      >
        {currentRefundOrder && (
          <div className="space-y-4">
            <div>
              <Text className="text-xs text-slate-500 block">
                {t("ordersCenter.orderNo", { no: currentRefundOrder.orderNumber })}
              </Text>
              {currentRefundOrder.date && (
                <Text className="text-xs text-slate-400 block mt-1">
                  {currentRefundOrder.date}
                </Text>
              )}
            </div>
            
            {/* 产品信息 */}
            <div className="flex gap-3 bg-slate-50 rounded-lg p-3">
              <img
                src={currentRefundOrder.product.image}
                alt={currentRefundOrder.product.name}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <Text className="text-sm font-medium block mb-1">
                  {currentRefundOrder.product.name}
                </Text>
                <Text className="text-xs text-slate-500 block mb-1">
                  {currentRefundOrder.product.store}
                </Text>
                <div className="flex items-center justify-between">
                  <Text className="text-base font-semibold text-slate-900">
                    ¥{currentRefundOrder.product.price}
                  </Text>
                  <Text className="text-xs text-slate-500">
                    x{currentRefundOrder.product.quantity}
                  </Text>
                </div>
              </div>
            </div>

            {/* 拒绝理由输入 */}
            <div>
              <Text className="text-sm text-slate-900 block mb-2">
                {t("ordersCenter.rejectReasonLabel") || "买家申请退款拒绝理由"}
                <span className="text-red-500 ml-1">*</span>
              </Text>
              <Input.TextArea
                rows={4}
                placeholder={t("ordersCenter.rejectReasonPlaceholder") || "请在这里输入拒绝理由..."}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="!rounded-lg"
                maxLength={200}
                showCount
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                block
                shape="round"
                className="!bg-white !border-slate-900 !text-slate-900 h-11"
                onClick={() => {
                  setRejectModalVisible(false);
                  setRejectReason("");
                  setCurrentRefundOrder(null);
                }}
                disabled={processingRefund}
              >
                {t("common.back") || "返回"}
              </Button>
              <Button
                type="primary"
                block
                shape="round"
                className="!bg-slate-900 !border-slate-900 h-11"
                onClick={handleRejectRefund}
                loading={processingRefund}
              >
                {t("common.confirm") || "确定"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
