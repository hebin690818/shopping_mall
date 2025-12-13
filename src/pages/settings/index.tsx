import { Button, Card, Typography, Form, Input } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { useConnection } from "wagmi";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../routes";
import { useGlobalLoading } from "../../contexts/LoadingProvider";
import { useRef, useState, useEffect } from "react";
import i18n from "@/i18n/config";
import backSvg from "@/assets/back.svg";
import { api, type MerchantDetail, type Address } from "../../lib/api";

const { Title, Text } = Typography;

export default function SettingsPage() {
  const navigate = useNavigate();
  const { address } = useConnection();
  const { t } = useTranslation("common");
  const { showLoading, hideLoading } = useGlobalLoading();
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [form] = Form.useForm();
  const [isMerchant, setIsMerchant] = useState(false);
  const [_merchantDetail, setMerchantDetail] = useState<MerchantDetail | null>(null);
  const [_isLoadingMerchant, setIsLoadingMerchant] = useState(false);
  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  const formatAddress = (addr: string | undefined) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const currentLang = i18n.language?.startsWith("en") ? "en" : "zh";

  const switchLang = (lang: "zh" | "en") => {
    if (lang === currentLang) return;
    i18n.changeLanguage(lang);
  };

  const handleSave = () => {
    if (!isMerchant) return;
    form.submit();
  };

  // 加载店铺信息
  useEffect(() => {
    let isMounted = true;

    const loadMerchantInfo = async () => {
      if (!address) {
        if (isMounted) {
          setIsMerchant(false);
        }
        return;
      }

      setIsLoadingMerchant(true);
      try {
        // 先通过钱包地址获取商家ID（API层已有去重机制）
        const merchantId = await api.getMerchantByWallet(address);
        
        if (!isMounted) return;

        if (merchantId) {
          // 如果有商家ID，再获取商家详情
          const detail = await api.getMerchantById(merchantId);
          
          if (!isMounted) return;

          if (detail) {
            setMerchantDetail(detail);
            setIsMerchant(true);
            // 填充表单数据
            form.setFieldsValue({
              name: detail.name || "",
              description: detail.description || "",
            });
          } else {
            setIsMerchant(false);
            setMerchantDetail(null);
          }
        } else {
          setIsMerchant(false);
          setMerchantDetail(null);
        }
      } catch (error: any) {
        // 如果是取消的请求，不更新状态
        if (error?.name === 'AbortError') {
          return;
        }
        console.error("加载商家信息失败:", error);
        if (isMounted) {
          setIsMerchant(false);
          setMerchantDetail(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingMerchant(false);
        }
      }
    };

    loadMerchantInfo();
    
    // 清理函数：组件卸载时清理
    return () => {
      isMounted = false;
      // 清除商家相关的缓存（可选，如果希望下次重新加载）
      // apiCache.clear('GET:/shop/api/merchants/');
    };
  }, [address, form]);

  // 加载默认地址
  useEffect(() => {
    let isMounted = true;

    const loadDefaultAddress = async () => {
      setIsLoadingAddress(true);
      try {
        const addressList = await api.getUserAddresses();
        if (isMounted) {
          // 取数组第一个元素（下标0）作为默认地址
          setDefaultAddress(addressList.length > 0 ? addressList[0] : null);
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          return;
        }
        console.error("加载地址列表失败:", error);
        if (isMounted) {
          setDefaultAddress(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingAddress(false);
        }
      }
    };

    loadDefaultAddress();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFinish = (values: { name: string; description?: string }) => {
    showLoading(t("globalLoading.defaultMessage"));
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }
    loadingTimerRef.current = setTimeout(() => {
      hideLoading();
      // 这里可以添加实际的保存商家信息逻辑
      console.log("保存商家信息:", values);
    }, 1200);
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
                      onClick={() => navigate(`${ROUTES.ADDRESS_EDIT}?id=${defaultAddress.id}`)}
                    >
                      {t("common.edit") || "编辑"}
                    </button>
                  )}
                </div>
                {isLoadingAddress ? (
                  <Text className="block text-xs text-slate-400 mt-1">
                    {t("loading.loading") || "加载中..."}
                  </Text>
                ) : defaultAddress ? (
                  <button
                    type="button"
                    className="w-full text-left mt-2"
                    onClick={() => navigate(`${ROUTES.ADDRESS_EDIT}?id=${defaultAddress.id}`)}
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
                      {t("common.add") || "添加"}
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
                    onClick={() => {
                      if (address) {
                        navigator.clipboard.writeText(address);
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
          {isMerchant && (
            <Card className="!rounded-lg shadow-sm">
              <Form
                form={form}
                layout="vertical"
                onFinish={handleFinish}
                initialValues={{
                  name: "",
                  description: "",
                }}
              >
                <div className="space-y-3">
                  <Title level={5} className="!mb-0">
                    {t("settings.storeInfo")}
                  </Title>

                  {/* 店铺名称行 */}
                  <div className="pt-2 border-t border-slate-100">
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
                      <div>
                        <Text className="text-sm font-medium text-slate-900 block mb-2">
                          {t("settings.storeName")}
                        </Text>
                        <Input
                          placeholder={t("merchantApply.namePlaceholder")}
                          className="!border-0 !border-b !rounded-none !px-0 !pb-3"
                        />
                      </div>
                    </Form.Item>
                  </div>

                  {/* 店铺简介 */}
                  <div className="pt-2 border-t border-slate-100">
                    <Form.Item name="description" className="!mb-0">
                      <div>
                        <Text className="text-sm font-medium text-slate-900 block mb-2">
                          {t("settings.storeIntro")}
                        </Text>
                        <Input.TextArea
                          autoSize={{ minRows: 3, maxRows: 6 }}
                          placeholder={t("merchantApply.descPlaceholder")}
                          className="min-h-[96px] rounded-2xl bg-slate-50 border border-slate-100 px-3 py-2"
                        />
                      </div>
                    </Form.Item>
                  </div>
                </div>
              </Form>
            </Card>
          )}
        </div>
      </div>

      {/* 底部保存按钮 - 仅商家显示 */}
      {isMerchant && (
        <div className="fixed left-0 right-0 bottom-0 px-4 pb-6 pt-4 bg-[#f5f5f8]">
          <Button
            type="primary"
            block
            shape="round"
            className="!bg-slate-900 !border-slate-900 h-12"
            onClick={handleSave}
          >
            {t("common.save")}
          </Button>
        </div>
      )}
    </div>
  );
}
