import { Card, Typography, Form, Input, message, Upload, Button } from "antd";
import { CopyOutlined, PlusOutlined } from "@ant-design/icons";
import { useConnection } from "wagmi";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/routes";
import { useGlobalLoading } from "@/contexts/LoadingProvider";
import { useRef, useState, useEffect } from "react";
import i18n from "@/i18n/config";
import backSvg from "@/assets/back.svg";
import { api, type MerchantDetail, type Address } from "@/lib/api";
import { copyToClipboard } from "@/lib/clipboardUtils";
import { API_BASE_URL_IMAGE } from "@/lib/config";

const { Title, Text } = Typography;

export default function SettingsPage() {
  const navigate = useNavigate();
  const { address } = useConnection();
  const { t } = useTranslation("common");
  const { showLoading, hideLoading } = useGlobalLoading();
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [form] = Form.useForm();
  const [isMerchant, setIsMerchant] = useState(false);
  const [merchantDetail, setMerchantDetail] = useState<MerchantDetail | null>(
    null
  );
  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatAddress = (addr: string | undefined) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const currentLang = i18n.language?.startsWith("en") ? "en" : "zh";

  const switchLang = (lang: "zh" | "en") => {
    if (lang === currentLang) return;
    i18n.changeLanguage(lang);
  };

  useEffect(() => {
    loadMerchantInfo();
  }, []);

  const loadMerchantInfo = async () => {
    const detail = await api.getMyMerchant({ force: true });
    console.log("获取到的商家详情:", detail);
    if (detail) {
      // 先设置状态，让表单渲染
      setMerchantDetail(detail);
      setIsMerchant(true);
      // 设置头像 URL
      if (detail.avatar) {
        setAvatarUrl(detail.avatar);
      }
    } else {
      setIsMerchant(false);
      setMerchantDetail(null);
      setAvatarUrl("");
    }
  };

  // 当表单渲染后，设置表单值
  useEffect(() => {
    if (merchantDetail && isMerchant) {
      // 更新头像 URL
      if (merchantDetail.avatar) {
        setAvatarUrl(merchantDetail.avatar);
      } else {
        setAvatarUrl("");
      }
      // 使用 requestAnimationFrame 确保表单已经完全渲染
      requestAnimationFrame(() => {
        const formValues = {
          name: merchantDetail.name || "",
          phone: merchantDetail.phone || "",
        };
        console.log("准备设置表单值:", formValues);
        form.setFieldsValue(formValues);
        console.log("表单值已设置，当前表单值:", form.getFieldsValue());
      });
    }
  }, [merchantDetail, isMerchant, form]);

  // 加载默认地址
  useEffect(() => {
    loadDefaultAddress();
  }, []);

  const loadDefaultAddress = async () => {
    const addressList = await api.getUserAddresses();
    setDefaultAddress(addressList.length > 0 ? addressList[0] : null);
  };

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
      message.error(t("merchantEdit.imageFormatLimit"));
      return false;
    }

    // 检查文件大小（5MB）
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      message.error(t("merchantEdit.imageSizeLimit"));
      return false;
    }

    try {
      setUploadingAvatar(true);
      const result = await api.uploadImage(file);
      setAvatarUrl(result.url);
      message.success(t("messages.uploadSuccess"));
    } catch (error: any) {
      console.error("上传头像失败:", error);
      message.error(error.message || t("messages.uploadFailed"));
    } finally {
      setUploadingAvatar(false);
    }

    return false; // 阻止默认上传
  };

  const handleFinish = async (values: { name: string; phone?: string }) => {
    if (isSubmitting) {
      return;
    }

    if (!merchantDetail) {
      message.error(t("messages.merchantNotFound"));
      return;
    }

    setIsSubmitting(true);
    showLoading(t("globalLoading.defaultMessage"));

    try {
      await api.updateMyMerchant({
        name: values.name,
        phone: values.phone || "",
        avatar: avatarUrl.startsWith("http")
          ? avatarUrl
          : `${API_BASE_URL_IMAGE}${avatarUrl}`,
      });

      message.success(t("messages.saveSuccess"));

      // 重新加载商家信息以获取最新数据
      await loadMerchantInfo();
    } catch (error: any) {
      console.error("保存商家信息失败:", error);
      message.error(error.message || t("messages.saveFailed"));
    } finally {
      hideLoading();
      setIsSubmitting(false);
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    }
  };

  return (
    <div
      className={`min-h-screen bg-[#f5f5f8] ${isMerchant ? "pb-24" : "pb-20"}`}
    >
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
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
            {t("settings.title")}
          </Title>
        </div>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-20">
        <div className="px-4 space-y-4">
          {/* 基本信息 */}
          <Card className="!rounded-lg shadow-sm">
            <div className="space-y-4">
              <Title level={5} className="!mb-0">
                {t("settings.basicInfo")}
              </Title>

              {/* 收货地址行 */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between py-2">
                  <Text className="text-sm font-medium text-slate-900 mb-1">
                    {t("settings.shippingAddress")}
                  </Text>
                  {defaultAddress && (
                    <button
                      type="button"
                      className="text-xs text-slate-500 hover:text-slate-700"
                      onClick={() =>
                        navigate(
                          `${ROUTES.ADDRESS_EDIT}?id=${defaultAddress.id}`
                        )
                      }
                    >
                      {t("common.edit")}
                    </button>
                  )}
                </div>
                {defaultAddress ? (
                  <button
                    type="button"
                    className="w-full text-left mt-2"
                    onClick={() =>
                      navigate(`${ROUTES.ADDRESS_EDIT}?id=${defaultAddress.id}`)
                    }
                  >
                    <div className="bg-slate-50 rounded-lg p-3 hover:bg-slate-100 transition-colors">
                      <Text className="block text-xs font-medium text-slate-900 mb-1">
                        {defaultAddress.recipient_name} {defaultAddress.phone}
                      </Text>
                      <Text className="block text-xs text-slate-500 line-clamp-2">
                        {defaultAddress.address}
                      </Text>
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="w-full text-left mt-2"
                    onClick={() => navigate(ROUTES.ADDRESS_EDIT)}
                  >
                    <Text className="block text-xs text-slate-500">
                      {t("common.add")}
                    </Text>
                  </button>
                )}
              </div>

              {/* 地址（钱包） */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <Text className="block text-sm font-medium text-slate-900 mb-1">
                      {t("settings.walletAddress")}
                    </Text>
                    <Text className="block text-xs text-slate-500 font-mono">
                      {address ? formatAddress(address) : "0x0000...0000"}
                    </Text>
                  </div>
                  <button
                    type="button"
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500"
                    aria-label={t("ariaLabels.copyAddress")}
                    onClick={async () => {
                      if (address) {
                        const success = await copyToClipboard(address);
                        if (success) {
                          message.success(t("profile.copy"));
                        } else {
                          message.error(t("messages.copyFailed"));
                        }
                      }
                    }}
                  >
                    <CopyOutlined />
                  </button>
                </div>
              </div>

              {/* 语言切换 */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between py-2">
                  <Text className="text-sm font-medium text-slate-900">
                    {t("settings.language")}
                  </Text>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => switchLang("zh")}
                      className={`px-4 h-9 rounded-full text-sm ${
                        currentLang === "zh"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {t("settings.langZh")}
                    </button>
                    <button
                      type="button"
                      onClick={() => switchLang("en")}
                      className={`px-4 h-9 rounded-full text-sm ${
                        currentLang === "en"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {t("settings.langEn")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
          {/* 店铺信息，仅商家显示 */}
          {isMerchant && merchantDetail && (
            <Card className="!rounded-lg shadow-sm">
              <Form
                form={form}
                layout="vertical"
                onFinish={handleFinish}
                key={merchantDetail.id}
                initialValues={{
                  name: merchantDetail.name || "",
                  phone: merchantDetail.phone || "",
                }}
              >
                <div className="space-y-3">
                  <Title level={5} className="!mb-0">
                    {t("settings.storeInfo")}
                  </Title>

                  {/* 头像上传 */}
                  <div className="pt-2 border-t border-slate-100">
                    <Form.Item
                      label={
                        <span className="text-sm text-slate-900">
                          {t("merchantApply.avatarLabel")}
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
                                alt={t("merchantApply.avatarLabel")}
                                className="w-full h-full object-cover rounded-xl"
                              />
                            ) : (
                              <PlusOutlined className="text-2xl" />
                            )}
                          </div>
                        </Upload>
                        <Text className="text-xs text-slate-500">
                          {t("merchantApply.avatarTip")}
                        </Text>
                      </div>
                    </Form.Item>
                  </div>

                  {/* 店铺名称行 */}
                  <div className="pt-2 border-t border-slate-100">
                    <Text className="text-sm font-medium text-slate-900 block mb-2">
                      {t("settings.storeName")}
                    </Text>
                    <Form.Item
                      name="name"
                      rules={[
                        {
                          required: true,
                          message: t("merchantApply.nameRequired"),
                        },
                      ]}
                      className="!mb-0"
                    >
                      <Input
                        placeholder={t("merchantApply.namePlaceholder")}
                        className="!border-0 !border-b !rounded-none !px-0 !pb-3"
                      />
                    </Form.Item>
                  </div>

                  {/* 店铺电话 */}
                  <div className="pt-2 border-t border-slate-100">
                    <Text className="text-sm font-medium text-slate-900 block mb-2">
                      {t("addressEdit.phone")}
                    </Text>
                    <Form.Item
                      name="phone"
                      rules={[
                        {
                          required: true,
                          message: t("addressEdit.phoneRequired"),
                        },
                      ]}
                      className="!mb-0"
                    >
                      <Input
                        placeholder={t("addressEdit.phonePlaceholder")}
                        className="!border-0 !border-b !rounded-none !px-0 !pb-3"
                        maxLength={11}
                      />
                    </Form.Item>
                  </div>
                </div>
              </Form>
            </Card>
          )}
        </div>
      </div>

      {/* 底部保存按钮，仅商家显示 */}
      {isMerchant && merchantDetail && (
        <div className="fixed left-0 right-0 bottom-0 px-4 pb-6 pt-4 bg-[#f5f5f8]">
          <Button
            type="primary"
            block
            shape="round"
            className="!bg-slate-900 !border-slate-900 h-12"
            onClick={() => form.submit()}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {t("common.save")}
          </Button>
        </div>
      )}
    </div>
  );
}
