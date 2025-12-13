import { Button, Form, Input, Typography, message } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useConnection } from "wagmi";
import { useState } from "react";
import { ROUTES } from "../../routes";
import {
  useMarketContract,
  useMarketQuery,
} from "../../hooks/useMarketContract";
import { useTokenContract, useTokenQuery } from "../../hooks/useTokenContract";
import { useGlobalLoading } from "../../contexts/LoadingProvider";
import { MARKET_CONTRACT_ADDRESS } from "../../lib/config";
import {
  phoneToBigInt,
  needsApproval,
  parseTokenAmount,
  formatTokenAmount,
} from "../../lib/contractUtils";
import backSvg from "@/assets/back.svg";

const { Title, Text } = Typography;

export default function MerchantApplyPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { t } = useTranslation("common");
  const { address, isConnected } = useConnection();
  const { showLoading, hideLoading } = useGlobalLoading();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { registerMerchant } = useMarketContract();
  const { approve } = useTokenContract();
  const { useMerchantFee } = useMarketQuery();
  const { useAllowance } = useTokenQuery();

  const { data: merchantFee } = useMerchantFee();
  const { data: allowance } = useAllowance(address, MARKET_CONTRACT_ADDRESS);

  const handleFinish = async (values: {
    name: string;
    phoneNumber?: string;
    description?: string;
  }) => {
    // 防止重复提交
    if (isSubmitting) {
      return;
    }

    if (!isConnected || !address) {
      message.error(t("messages.connectWalletFirst"));
      return;
    }

    if (!values.phoneNumber) {
      message.error(t("merchantApply.phoneNumberRequired"));
      return;
    }

    setIsSubmitting(true);

    try {
      showLoading(t("loading.processingRegistration"));

      // 1. 检查并授权代币
      const feeAmount =
        merchantFee && typeof merchantFee === "bigint"
          ? merchantFee
          : parseTokenAmount("100"); // 默认100U

      // 添加10%缓冲，避免精度问题
      const approveAmount = (feeAmount * 110n) / 100n;
      const needsApprove = needsApproval(
        allowance && typeof allowance === "bigint" ? allowance : undefined,
        feeAmount
      );

      if (needsApprove) {
        showLoading(t("loading.approving"));
        // 使用格式化的金额，确保精度
        const approveAmountStr = formatTokenAmount(approveAmount, 18, 18);
        
        // 调用授权，等待交易确认
        const approveReceipt = await approve(MARKET_CONTRACT_ADDRESS, approveAmountStr);
        
        // 检查授权交易状态
        if (approveReceipt.status === "success") {
          message.success(t("messages.approveSuccess"));
        } else {
          throw new Error(t("messages.approveConfirmFailed"));
        }
      }

      // 2. 转换电话号码为BigInt
      const phoneNumber = phoneToBigInt(values.phoneNumber);

      // 3. 注册商家，等待交易确认
      showLoading(t("loading.registeringMerchant"));
      const receipt = await registerMerchant(values.name, phoneNumber);

      // 4. 检查交易状态
      if (receipt.status === "success") {
        hideLoading();
        setIsSubmitting(false);
        message.success(t("messages.registerSuccess"));
        navigate(ROUTES.MERCHANT_APPLY_RESULT.replace(":status", "success"));
      } else {
        throw new Error(t("messages.transactionFailed"));
      }
    } catch (error: any) {
      console.error("注册商家失败:", error);
      hideLoading();
      setIsSubmitting(false);
      // 判断是否是用户拒绝交易
      const errorMessage =
        error?.message || error?.shortMessage || t("messages.registerFailed");
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
        message.error(errorMessage || t("messages.registerFailed"));
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f8] pb-12">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
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
            {t("merchantApply.title")}
          </Title>
        </div>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-20">
        {/* 表单卡片 */}
        <div className="px-4">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <Form
              layout="vertical"
              form={form}
              onFinish={handleFinish}
              requiredMark="optional"
            >
              <Form.Item
                label={
                  <span className="text-sm text-slate-900">
                    {t("merchantApply.nameLabel")}{" "}
                    <span className="text-red-500">*</span>
                  </span>
                }
                name="name"
                rules={[
                  { required: true, message: t("merchantApply.nameRequired") },
                ]}
              >
                <Input
                  size="large"
                  placeholder={t("merchantApply.namePlaceholder")}
                  className="!border-0 !border-b !rounded-none !px-0 !pb-3"
                />
              </Form.Item>

              <div className="h-px bg-slate-100" />

              <Form.Item
                label={
                <span className="text-sm text-slate-900">
                  {t("merchantApply.phoneNumber")} <span className="text-red-500">*</span>
                </span>
              }
              name="phoneNumber"
              rules={[
                { required: true, message: t("merchantApply.phoneNumberRequired") },
                { pattern: /^1[3-9]\d{9}$/, message: t("merchantApply.phoneNumberInvalid") },
              ]}
            >
              <Input
                size="large"
                placeholder={t("merchantApply.phoneNumberPlaceholder")}
                className="!border-0 !border-b !rounded-none !px-0 !pb-3"
                maxLength={11}
              />
              </Form.Item>

              {/* <div className="h-px bg-slate-100" />

            <Form.Item
              label={
                <span className="text-sm text-slate-900">
                  {t("merchantApply.descLabel")}
                </span>
              }
              name="description"
            >
              <Input.TextArea
                autoSize={{ minRows: 2, maxRows: 4 }}
                placeholder={t("merchantApply.descPlaceholder")}
                className="!border-0 !px-0 !pt-1"
              />
            </Form.Item> */}
            </Form>
          </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="fixed left-0 right-0 bottom-0 px-4 pb-6 pt-4 bg-[#f5f5f8]">
        <Button
          type="primary"
          block
          shape="round"
          className="!bg-slate-900 !border-slate-900 h-12"
          onClick={() => form.submit()}
          loading={isSubmitting}
          disabled={!isConnected || isSubmitting}
        >
          {!isConnected
            ? t("messages.connectWalletFirst")
            : isSubmitting
            ? t("messages.processing")
            : t("merchantApply.submit")}
        </Button>
        <Text className="mt-2 block text-center text-xs text-slate-400">
          {t("merchantApply.tip")}
        </Text>
      </div>
    </div>
  );
}
