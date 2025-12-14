import { useState, useEffect } from "react";
import { Card, Typography, Button, Progress, message } from "antd";
import { useTranslation } from "react-i18next";
import { useConnection } from "wagmi";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../routes";
import {
  useRewardContract,
  useRewardQuery,
} from "../../hooks/useRewardContract";
import { useTokenQuery } from "../../hooks/useTokenContract";
import { useMarketQuery } from "../../hooks/useMarketContract";
import { useGlobalLoading } from "../../contexts/LoadingProvider";
import {
  formatTokenAmount,
  calculatePercentage,
} from "../../lib/contractUtils";
import { CopyOutlined, RightOutlined } from "@ant-design/icons";

const { Text, Title } = Typography;

export default function ProfilePage() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { address, isConnected } = useConnection();
  const { showLoading, hideLoading } = useGlobalLoading();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const { claim } = useRewardContract();
  const { usePendingReward, useUserPower } = useRewardQuery();
  const { useBalance } = useTokenQuery();
  const { useIsMerchant } = useMarketQuery();

  // 查询合约数据
  const { data: pendingReward } = usePendingReward(address);
  const { data: userPower } = useUserPower(address);
  const { data: balance } = useBalance(address);
  const { data: isMerchantData } = useIsMerchant(address);
  const isMerchant = Boolean(isMerchantData);

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

  // 处理领取奖励
  const handleClaim = async () => {
    if (isClaiming) {
      return;
    }

    if (!isConnected || !address) {
      message.error(t("messages.connectWalletFirst"));
      return;
    }

    if (
      !pendingReward ||
      (typeof pendingReward === "bigint" && pendingReward === 0n)
    ) {
      message.warning(t("messages.noRewardAvailable"));
      return;
    }

    setIsClaiming(true);

    try {
      showLoading(t("loading.claimingReward"));
      const receipt = await claim();
      
      // 检查交易状态
      if (receipt.status === "success") {
        hideLoading();
        setIsClaiming(false);
        message.success(t("messages.claimSuccess"));
        // 刷新数据
        window.location.reload();
      } else {
        throw new Error(t("messages.transactionFailed"));
      }
    } catch (error: any) {
      console.error("领取奖励失败:", error);
      hideLoading();
      setIsClaiming(false);
      const errorMessage = error?.message || error?.shortMessage || t("messages.claimFailed");
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
        message.error(errorMessage || t("messages.claimFailed"));
      }
    }
  };

  // 格式化数据
  const formattedBalance =
    balance && typeof balance === "bigint"
      ? formatTokenAmount(balance)
      : "0.00";
  const consumptionPower =
    userPower && typeof userPower === "bigint"
      ? formatTokenAmount(userPower)
      : "0.00";
  const dividendAmount =
    pendingReward && typeof pendingReward === "bigint"
      ? formatTokenAmount(pendingReward)
      : "0.00";
  const dividendProgress =
    userPower &&
    pendingReward &&
    typeof userPower === "bigint" &&
    typeof pendingReward === "bigint"
      ? Math.min(100, calculatePercentage(pendingReward, userPower))
      : 0;

  // 监听滚动，为固定头部添加背景色
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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
          background: isScrolled ? "rgba(200, 223, 247, 0.8)" : "transparent",
          backdropFilter: isScrolled ? "blur(10px)" : "none",
        }}
      >
        <Title level={5} className="!text-black !mb-0">
          {t("profile.title")}
        </Title>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-20">
        <div className="px-4 space-y-4">
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
                  {t("profile.assets.balance", { value: formattedBalance })}
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
                  <Text className="text-sm font-semibold">
                    {formattedBalance}
                  </Text>
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
                  onClick={handleClaim}
                  loading={isClaiming}
                  disabled={
                    !isConnected ||
                    !pendingReward ||
                    (typeof pendingReward === "bigint" && pendingReward === 0n)
                  }
                  style={{
                    color: "#fff !important",
                  }}
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
            {isMerchant && (
              <>
                <Card className="!rounded-xl shadow-sm !p-0">
                  <button
                    className="w-full flex items-center justify-between hover:bg-slate-50 transition-colors rounded-xl"
                    onClick={() => navigate(ROUTES.ORDERS_LIST)}
                  >
                    <Text className="text-base">{t("profile.links.orders")}</Text>
                    <RightOutlined className="text-slate-400" />
                  </button>
                </Card>
                <Card className="!rounded-xl shadow-sm !p-0">
                  <button
                    className="w-full flex items-center justify-between hover:bg-slate-50 transition-colors rounded-xl"
                    onClick={() => navigate(ROUTES.MERCHANT_CENTER)}
                  >
                    <Text className="text-base">{t("profile.links.merchant")}</Text>
                    <RightOutlined className="text-slate-400" />
                  </button>
                </Card>
              </>
            )}
            <Card className="!rounded-xl shadow-sm !p-0">
              <button
                className="w-full flex items-center justify-between hover:bg-slate-50 transition-colors rounded-xl"
                onClick={() => navigate(ROUTES.SETTINGS)}
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
