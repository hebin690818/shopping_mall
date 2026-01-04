import { Button, Form, Input, Typography, message, Upload } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useConnection } from "wagmi";
import { useState } from "react";
import { ROUTES } from "@/routes";
import { useMarketContract, useMarketQuery } from "@/hooks/useMarketContract";
import { useTokenContract, useTokenQuery } from "@/hooks/useTokenContract";
import { useGlobalLoading } from "@/contexts/LoadingProvider";
import { MARKET_CONTRACT_ADDRESS, API_BASE_URL_IMAGE } from "@/lib/config";
import {
  phoneToBigInt,
  needsApproval,
  parseTokenAmount,
  formatTokenAmount,
} from "@/lib/contractUtils";
import { api } from "@/lib/api";
import backSvg from "@/assets/back.svg";

const { Title, Text } = Typography;

export default function MerchantApplyPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { t } = useTranslation("common");
  const { address, isConnected } = useConnection();
  const { showLoading, hideLoading } = useGlobalLoading();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const { registerMerchant } = useMarketContract();
  const { approve } = useTokenContract();
  const { useMerchantFee } = useMarketQuery();
  const { useAllowance } = useTokenQuery();

  const { data: merchantFee } = useMerchantFee();
  const { data: allowance } = useAllowance(address, MARKET_CONTRACT_ADDRESS);

  // 处理头像上传
  const handleAvatarUpload = async (file: File) => {
    // 检查文件类型
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    const allowedExtensions = ["jpg", "jpeg", "png", "gif", "webp"];

    if (
      !allowedTypes.includes(file.type) &&
      !allowedExtensions.includes(fileExtension || "")
    ) {
      message.error(
        t("merchantEdit.imageFormatLimit") ||
          "图片格式只能是 JPG、PNG、JPEG、GIF、WEBP"
      );
      return false;
    }

    // 检查文件大小（5MB）
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      message.error(t("merchantEdit.imageSizeLimit") || "图片大小不能超过5M");
      return false;
    }

    try {
      setUploadingAvatar(true);
      const result = await api.uploadImage(file);
      setAvatarUrl(result.url);
      message.success(t("messages.uploadSuccess") || "上传成功");
    } catch (error: any) {
      console.error("上传头像失败:", error);
      message.error(error.message || t("messages.uploadFailed") || "上传失败");
    } finally {
      setUploadingAvatar(false);
    }

    return false; // 阻止默认上传
  };

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

      const needsApprove = needsApproval(
        allowance && typeof allowance === "bigint" ? allowance : undefined,
        feeAmount
      );

      if (needsApprove) {
        showLoading(t("loading.approving"));
        // 使用格式化的金额，确保精度
        const approveAmountStr = formatTokenAmount(feeAmount, 18, 18);

        // 调用授权，等待交易确认
        const approveReceipt = await approve(
          MARKET_CONTRACT_ADDRESS,
          approveAmountStr
        );

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
        // 延迟 1500ms 后执行，确保链上交易已确认
        setTimeout(async () => {
          try {
            await api.updateMyMerchant({
              name: values.name,
              phone: values.phoneNumber || "",
              avatar: avatarUrl.startsWith("http")
                ? avatarUrl
                : `${API_BASE_URL_IMAGE}${avatarUrl}`,
            });
          } catch (error: any) {
            // 静默处理错误，不影响用户体验
            console.error("更新商家信息失败（不影响主流程）:", error);
          }
        }, 1500);

        // 延迟执行主流程，确保在跳转前启动 API 调用
        setTimeout(() => {
          hideLoading();
          setIsSubmitting(false);
          message.success(t("messages.registerSuccess"));
          navigate(ROUTES.MERCHANT_APPLY_RESULT.replace(":status", "success"));
        }, 2000);
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
              {/* 头像上传 */}
              <Form.Item
                label={
                  <span className="text-sm text-slate-900">
                    {t("merchantApply.avatarLabel") || "店铺头像"}
                  </span>
                }
                name="avatar"
              >
                <div className="flex items-center gap-4">
                  <Upload
                    beforeUpload={handleAvatarUpload}
                    showUploadList={false}
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  >
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-500 transition-all duration-200 cursor-pointer">
                      {uploadingAvatar ? (
                        <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      ) : avatarUrl ? (
                        <img
                          src={
                            avatarUrl.startsWith("http")
                              ? avatarUrl
                              : `${API_BASE_URL_IMAGE}${avatarUrl}`
                          }
                          alt="店铺头像"
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <PlusOutlined className="text-2xl" />
                      )}
                    </div>
                  </Upload>
                  <Text className="text-xs text-slate-500">
                    {t("merchantApply.avatarTip") ||
                      "支持 JPG、PNG 格式，建议尺寸 200x200"}
                  </Text>
                </div>
              </Form.Item>

              <div className="h-px bg-slate-100" />

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
                    {t("merchantApply.phoneNumber")}{" "}
                    <span className="text-red-500">*</span>
                  </span>
                }
                name="phoneNumber"
                rules={[
                  {
                    required: true,
                    message: t("merchantApply.phoneNumberRequired"),
                  },
                  {
                    pattern: /^1[3-9]\d{9}$/,
                    message: t("merchantApply.phoneNumberInvalid"),
                  },
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
