import { Button, Card, Typography, Form, Input } from "antd";
import { LeftOutlined, RightOutlined, CopyOutlined } from "@ant-design/icons";
import { useAccount } from "wagmi";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n/config";

const { Title, Text } = Typography;

type SettingsPageProps = {
  isMerchant?: boolean;
  onBack?: () => void;
  onEditAddress?: () => void;
  onSave?: (values: { name: string; description?: string }) => void;
};

export default function SettingsPage({
  isMerchant,
  onBack,
  onEditAddress,
  onSave,
}: SettingsPageProps) {
  const { address } = useAccount();
  const { t } = useTranslation("common");
  const [form] = Form.useForm();

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

  const handleFinish = (values: { name: string; description?: string }) => {
    onSave?.(values);
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
            onClick={onBack}
            aria-label="返回"
            className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-700"
          >
            <LeftOutlined />
          </button>
          <Title level={4} className="!mb-0">
            {t("settings.title")}
          </Title>
        </div>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-20">
        <div className="px-4 mt-4 space-y-4">
          {/* 基本信息 */}
          <Card className="!rounded-3xl shadow-sm">
            <div className="space-y-4">
              <Title level={5} className="!mb-0">
                {t("settings.basicInfo")}
              </Title>

              {/* 收货地址行 */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  className="w-full flex items-center justify-between py-2"
                  onClick={onEditAddress}
                >
                  <div className="flex-1 text-left">
                    <Text className="block text-sm font-medium text-slate-900 mb-1">
                      {t("settings.shippingAddress")}
                    </Text>
                    <Text className="block text-xs text-slate-500">
                      {t("settings.shippingAddressDesc")}
                    </Text>
                  </div>
                  <RightOutlined className="text-slate-400 text-xs" />
                </button>
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
                    aria-label="复制地址"
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
            <Card className="!rounded-3xl shadow-sm">
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
            {t("common.save") ?? "保存"}
          </Button>
        </div>
      )}
    </div>
  );
}
