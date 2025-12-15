import { useState, useEffect, useRef } from "react";
import { Button, Typography, Input, message, Spin, Modal } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useConnection } from "wagmi";
import { ROUTES } from "@/routes";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CarOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import { type Order } from "../orders";
import { useAuth } from "@/hooks/useAuth";
import { useMerchantOrders } from "@/hooks/useMerchantOrders";
import { useMarketContract } from "@/hooks/useMarketContract";
import { useGlobalLoading } from "@/contexts/LoadingProvider";
import { api } from "@/lib/api";
import backSvg from "@/assets/back.svg";
import { API_BASE_URL } from "@/lib/config";

const { Text, Title } = Typography;

export default function OrdersListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { address } = useAuth();
  const { isConnected } = useConnection();
  const { refundOrder } = useMarketContract();
  const { showLoading, hideLoading } = useGlobalLoading();
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
  const [currentRefundOrder, setCurrentRefundOrder] = useState<Order | null>(
    null
  );
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

  // 复制运单号
  const handleCopyTrackingNumber = async (trackingNumber: string) => {
    if (!trackingNumber) return;
    try {
      await navigator.clipboard.writeText(trackingNumber);
      message.success(t("profile.copy"));
    } catch (err) {
      console.error("复制失败:", err);
      message.error(t("messages.copyFailed"));
    }
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
      message.error(
        error?.message || t("messages.loadFailed")
      );
    }
  };

  const getStatusButton = (status: Order["status"]) => {
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
            className="!bg-blue-500 !border-blue-500 !text-white px-3"
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
            className="!bg-orange-500 !border-orange-500 !text-white px-3"
            icon={<ClockCircleOutlined />}
          >
            {t("ordersCenter.tabs.pending")}
          </Button>
        );
      default:
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
  // 执行同意退款操作（通过合约执行）
  const executeApproveRefund = async () => {
    if (!currentRefundOrder || processingRefund) return;

    // 检查钱包连接
    if (!isConnected || !address) {
      message.error(t("messages.connectWalletFirst"));
      return;
    }

    // 检查订单索引
    if (!currentRefundOrder.orderIndex) {
      message.error(t("messages.invalidOrderIndex"));
      return;
    }

    setProcessingRefund(true);

    try {
      showLoading(t("loading.processingRefund"));

      // 调用合约执行退款
      const receipt = await refundOrder(currentRefundOrder.orderIndex);

      // 检查交易状态
      if (receipt.status === "success") {
        hideLoading();
        setProcessingRefund(false);
        message.success(t("messages.refundSuccess"));
        setApproveModalVisible(false);
        setCurrentRefundOrder(null);

        // 立即刷新一次（可能数据还没更新）
        if (refreshOrders) {
          await (refreshOrders as (force?: boolean) => Promise<void>)(true);
        }

        // 等待后端同步合约状态，然后多次重试刷新
        // 延迟2秒后刷新，给后端时间同步合约状态
        setTimeout(async () => {
          if (refreshOrders) {
            await (refreshOrders as (force?: boolean) => Promise<void>)(true);
          }
        }, 2000);

        // 再次延迟刷新，确保数据已同步
        setTimeout(async () => {
          if (refreshOrders) {
            await (refreshOrders as (force?: boolean) => Promise<void>)(true);
          }
        }, 5000);
      } else {
        throw new Error(t("messages.transactionFailed"));
      }
    } catch (error: any) {
      console.error("同意退款失败:", error);
      hideLoading();
      setProcessingRefund(false);

      const errorMessage =
        error?.message ||
        error?.shortMessage ||
        t("messages.refundFailed") ||
        "同意退款失败，请重试";
      const errorStr = String(errorMessage).toLowerCase();

      // 处理用户取消交易的情况
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

  // 处理同意退款（带二次确认）
  const handleApproveRefund = () => {
    if (!currentRefundOrder || processingRefund) return;

    executeApproveRefund();
  };

  // 执行拒绝退款操作
  const executeRejectRefund = async () => {
    if (!currentRefundOrder || processingRefund) return;

    if (!rejectReason.trim()) {
      message.warning(
        t("ordersCenter.rejectReasonRequired")
      );
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
      message.success(t("ordersCenter.rejectRefundSuccess"));
      setRejectModalVisible(false);
      setRejectReason("");
      setCurrentRefundOrder(null);

      // 刷新订单列表
      if (refreshOrders) {
        refreshOrders();
      }
    } catch (error: any) {
      message.error(
        error?.message ||
          t("ordersCenter.rejectRefundFailed") ||
          "拒绝退款失败，请重试"
      );
    } finally {
      setProcessingRefund(false);
    }
  };

  // 处理拒绝退款（带二次确认）
  const handleRejectRefund = () => {
    if (!currentRefundOrder || processingRefund) return;

    if (!rejectReason.trim()) {
      message.warning(
        t("ordersCenter.rejectReasonRequired")
      );
      return;
    }

    executeRejectRefund();
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
        text: t("ordersCenter.refundStatusPending"),
        color: "text-slate-600",
        icon: <ClockCircleOutlined />,
      };
    } else if (order.apiStatus === "refunded") {
      return {
        text: t("ordersCenter.refundStatusRefunded"),
        color: "text-green-600",
        icon: <CheckCircleOutlined />,
      };
    } else if (order.apiStatus === "refund_rejected") {
      return {
        text: t("ordersCenter.refundStatusRejected"),
        color: "text-red-600",
        icon: <CloseCircleOutlined />,
      };
    }
    return null;
  };

  const tabs = [
    { key: "all", label: t("ordersCenter.tabs.all") },
    { key: "completed", label: t("ordersCenter.tabs.completed") },
    { key: "unfinished", label: t("ordersCenter.tabs.unfinished") },
    { key: "pending", label: t("ordersCenter.tabs.pending") },
    { key: "refund", label: t("ordersCenter.tabs.refund") },
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
                const isRefundRequested =
                  order.apiStatus === "refund_requested";
                const isRefunded = order.apiStatus === "refunded";
                const isRefundRejected = order.apiStatus === "refund_rejected";

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-lg shadow-sm overflow-hidden"
                  >
                    {/* 退款请求标题 */}
                    {(isRefundRequested || isRefunded || isRefundRejected) && (
                      <div className="px-4 pt-4">
                        <Text className="text-sm font-medium text-slate-900">
                          {t("ordersCenter.buyerRefundRequest") ||
                            "买家申请退款"}
                        </Text>
                      </div>
                    )}

                    <div className="p-4 space-y-3">
                      {/* Order Header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <Text className="text-xs text-slate-500 block">
                            {t("ordersCenter.orderNo", {
                              no: order.orderNumber,
                            })}
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

                      {/* Total and view details */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <Text className="text-sm text-slate-500">
                          {t("ordersCenter.totalPrice", {
                            amount: order.total,
                          })}
                        </Text>
                        {order.status === "completed" &&
                          !isRefundRequested &&
                          !isRefunded && (
                            <button
                              type="button"
                              className="text-xs text-slate-500 flex items-center gap-1"
                              onClick={() =>
                                navigate(
                                  ROUTES.ORDER_DETAIL.replace(":id", order.id),
                                  { state: { order } }
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
                                ROUTES.ORDER_DETAIL.replace(":id", order.id),
                                { state: { order } }
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
                            {t("ordersCenter.reject")}
                          </Button>
                          <Button
                            type="primary"
                            block
                            shape="round"
                            className="!bg-slate-900 !border-slate-900 h-11"
                            onClick={() => openApproveModal(order)}
                            disabled={processingRefund}
                          >
                            {t("ordersCenter.approve")}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Upload Logistics Section for Unfinished Orders */}
                    {order.status !== "completed" &&
                      !isRefundRequested &&
                      !isRefunded && (
                        <div className="border-t border-slate-100 px-4 py-4 space-y-3">
                          <Text className="text-xs text-slate-500 block">
                            {t("ordersCenter.uploadLogisticsTitle")}
                          </Text>
                          <Input
                            size="large"
                            placeholder={t("ordersCenter.waybillPlaceholder")}
                            className="!rounded-xl !bg-slate-50 !border-slate-200 text-sm"
                            value={
                              order.tracking_number ||
                              logisticsData[order.id]?.waybill ||
                              ""
                            }
                            onChange={(e) =>
                              handleLogisticsChange(
                                order.id,
                                "waybill",
                                e.target.value
                              )
                            }
                            disabled={!!order.tracking_number}
                            suffix={
                              (order.tracking_number ||
                                logisticsData[order.id]?.waybill) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopyTrackingNumber(
                                      order.tracking_number ||
                                        logisticsData[order.id]?.waybill ||
                                        ""
                                    )
                                  }
                                  className="text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center"
                                  aria-label={t("ariaLabels.copyAddress")}
                                >
                                  <CopyOutlined className="text-sm" />
                                </button>
                              )
                            }
                          />
                          {!order.tracking_number && (
                            <Button
                              type="primary"
                              block
                              shape="round"
                              className="!bg-slate-900 !border-slate-900 h-11"
                              onClick={() => handleUpload(order.id)}
                            >
                              {t("ordersCenter.upload")}
                            </Button>
                          )}
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
        centered
      >
        {currentRefundOrder && (
          <div className="space-y-4">
            <div>
              <Text className="text-xs text-slate-500 block">
                {t("ordersCenter.orderNo", {
                  no: currentRefundOrder.orderNumber,
                })}
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
                src={currentRefundOrder.product_image_url || currentRefundOrder.image}
                alt={currentRefundOrder.product_name || currentRefundOrder.name}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <Text className="text-sm font-medium block mb-1">
                  {currentRefundOrder.product_name || currentRefundOrder.name}
                </Text>
                <Text className="text-xs text-slate-500 block mb-1">
                  {currentRefundOrder.store}
                </Text>
                <div className="flex items-center justify-between">
                  <Text className="text-base font-semibold text-slate-900">
                    ${currentRefundOrder.price}
                  </Text>
                  <Text className="text-xs text-slate-500">
                    x{currentRefundOrder.quantity}
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
                {t("common.back")}
              </Button>
              <Button
                type="primary"
                block
                shape="round"
                className="!bg-slate-900 !border-slate-900 h-11"
                onClick={handleApproveRefund}
                loading={processingRefund}
              >
                {t("ordersCenter.approveRefund")}
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
        centered
      >
        {currentRefundOrder && (
          <div className="space-y-4">
            <div>
              <Text className="text-xs text-slate-500 block">
                {t("ordersCenter.orderNo", {
                  no: currentRefundOrder.orderNumber,
                })}
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
                src={currentRefundOrder.product_image_url || currentRefundOrder.image}
                alt={currentRefundOrder.product_name || currentRefundOrder.name}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <Text className="text-sm font-medium block mb-1">
                  {currentRefundOrder.product_name || currentRefundOrder.name}
                </Text>
                <Text className="text-xs text-slate-500 block mb-1">
                  {currentRefundOrder.store}
                </Text>
                <div className="flex items-center justify-between">
                  <Text className="text-base font-semibold text-slate-900">
                    ${currentRefundOrder.price}
                  </Text>
                  <Text className="text-xs text-slate-500">
                    x{currentRefundOrder.quantity}
                  </Text>
                </div>
              </div>
            </div>

            {/* 拒绝理由输入 */}
            <div>
              <Text className="text-sm text-slate-900 block mb-2">
                {t("ordersCenter.rejectReasonLabel")}
                <span className="text-red-500 ml-1">*</span>
              </Text>
              <Input.TextArea
                rows={4}
                placeholder={
                  t("ordersCenter.rejectReasonPlaceholder") ||
                  "请在这里输入拒绝理由..."
                }
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
                {t("common.back")}
              </Button>
              <Button
                type="primary"
                block
                shape="round"
                className="!bg-slate-900 !border-slate-900 h-11"
                onClick={handleRejectRefund}
                loading={processingRefund}
              >
                {t("common.confirm")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
