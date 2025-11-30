import { useState, useEffect } from "react";
import { Card, Typography, Button, Progress, message } from "antd";
import { useTranslation } from "react-i18next";
import { useAccount } from "wagmi";
import { CopyOutlined, RightOutlined } from "@ant-design/icons";

const { Text, Title } = Typography;

type ProfilePageProps = {
  onOpenOrders?: () => void;
  onOpenMerchantCenter?: () => void;
  onOpenSettings?: () => void;
};

export default function ProfilePage({
  onOpenOrders,
  onOpenMerchantCenter,
  onOpenSettings,
}: ProfilePageProps) {
  const { t } = useTranslation("common");
  const { address } = useAccount();
  const [isScrolled, setIsScrolled] = useState(false);

  const formatAddress = (addr: string | undefined) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      message.success(t("profile.copy"));
    }
  };

  // 模拟数据
  const balance = "1234.56";
  const consumptionPower = "100.00";
  const tokenHoldings = "1,0000";
  const dividendAmount = "1234.56";
  const dividendProgress = 60;

  // 监听滚动，为固定头部添加背景色
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className="min-h-screen pb-20"
      style={{
        backgroundImage: "url(/bg.svg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Fixed Header */}
      <div
        className="fixed top-0 left-0 right-0 z-50 p-4 shadow-sm transition-all duration-300"
        style={{ 
          background: isScrolled ? 'rgba(200, 223, 247, 0.8)' : 'transparent',
          backdropFilter: isScrolled ? 'blur(10px)' : 'none',
        }}
      >
        <Title level={4} className="!text-black !mb-0">
          {t("profile.title")}
        </Title>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-20">
        <div className="px-4 py-4 space-y-4">
          {/* User Profile Card */}
          <Card className="!rounded-xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                {address ? address.slice(2, 3).toUpperCase() : "U"}
              </div>
              <div className="flex-1">
                <Text className="text-base font-medium block mb-1">
                  {t("profile.user.defaultName")}
                </Text>
                <div className="flex items-center gap-2">
                  <Text className="text-xs text-slate-500 font-mono">
                    {address ? formatAddress(address) : "0x0000...0000"}
                  </Text>
                  {address && (
                    <button
                      onClick={handleCopyAddress}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <CopyOutlined className="text-xs" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* My Assets Card */}
          <Card className="!rounded-xl shadow-sm">
            <div className="space-y-4">
              <Title level={5} className="!mb-0">
                {t("profile.assets.title")}
              </Title>
              <div>
                <Text className="text-3xl font-bold text-slate-900">
                  {t("profile.assets.balance", { value: balance })}
                </Text>
              </div>
              <div className="flex gap-6">
                <div>
                  <Text className="text-xs text-slate-500 block mb-1">
                    {t("profile.assets.consumptionPower")}
                  </Text>
                  <Text className="text-sm font-semibold">
                    {consumptionPower}
                  </Text>
                </div>
                <div>
                  <Text className="text-xs text-slate-500 block mb-1">
                    {t("profile.assets.tokenHoldings")}
                  </Text>
                  <Text className="text-sm font-semibold">{tokenHoldings}</Text>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <Text className="text-xs text-slate-500">
                  {t("profile.assets.note")}
                </Text>
              </div>
            </div>
          </Card>

          {/* Dividend Center Card */}
          <Card className="!rounded-xl shadow-sm">
            <div className="space-y-4">
              <Title level={5} className="!mb-0">
                {t("profile.dividend.title")}
              </Title>
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-xs text-slate-500 block mb-1">
                    {t("profile.dividend.available")}
                  </Text>
                  <Text className="text-xl font-semibold text-slate-900">
                    {t("profile.assets.balance", { value: dividendAmount })}
                  </Text>
                </div>
                <Button
                  type="primary"
                  className="!rounded-full !bg-slate-800 !border-slate-800"
                >
                  {t("profile.dividend.claim")}
                </Button>
              </div>
              <div>
                <Text className="text-xs text-slate-500 block mb-2">
                  {t("profile.dividend.note")}
                </Text>
                <Progress
                  percent={dividendProgress}
                  showInfo={false}
                  strokeColor="#475569"
                  className="!mb-0"
                />
              </div>
            </div>
          </Card>

          {/* Navigation Links */}
          <div className="space-y-2">
            <Card className="!rounded-xl shadow-sm !p-0">
              <button
                className="w-full flex items-center justify-between hover:bg-slate-50 transition-colors rounded-xl"
                onClick={onOpenOrders}
              >
                <Text className="text-base">{t("profile.links.orders")}</Text>
                <RightOutlined className="text-slate-400" />
              </button>
            </Card>
            <Card className="!rounded-xl shadow-sm !p-0">
              <button
                className="w-full flex items-center justify-between hover:bg-slate-50 transition-colors rounded-xl"
                onClick={onOpenMerchantCenter}
              >
                <Text className="text-base">{t("profile.links.merchant")}</Text>
                <RightOutlined className="text-slate-400" />
              </button>
            </Card>
            <Card className="!rounded-xl shadow-sm !p-0">
              <button
                className="w-full flex items-center justify-between hover:bg-slate-50 transition-colors rounded-xl"
                onClick={onOpenSettings}
              >
                <Text className="text-base">{t("profile.links.settings")}</Text>
                <RightOutlined className="text-slate-400" />
              </button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
