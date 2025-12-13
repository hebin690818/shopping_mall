import { useState, useEffect } from "react";
import { Button, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useConnection } from "wagmi";
import { ROUTES } from "../../routes";
import { useMarketQuery } from "../../hooks/useMarketContract";

const { Title, Text, Paragraph } = Typography;

type Merchant = {
  id: string;
  name: string;
  category: string;
  cover: string;
};

const merchants: Merchant[] = Array.from({ length: 4 }, (_, index) => ({
  id: `merchant-${index + 1}`,
  name: "科技数码旗舰店",
  category: "电脑与配件",
  cover:
    "https://res8.vmallres.com/pimages/FssCdnProxy/vmall_product_uom/pmsSalesFile/428_428_D81269DA3E29C2ABF67DED5D8385E20A.png",
}));

export default function MerchantPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { address, isConnected } = useConnection();
  const [isScrolled, setIsScrolled] = useState(false);
  
  const { useIsMerchant } = useMarketQuery();
  const { data: isMerchant, isLoading: isCheckingMerchant } = useIsMerchant(address);

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
      className="min-h-screen pb-24"
      style={{
        backgroundImage: 'url(/bg.svg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Fixed Header */}
      <div 
        className="fixed top-0 left-0 right-0 z-50 shadow-sm transition-all duration-300"
        style={{ 
          background: isScrolled ? 'rgba(200, 223, 247, 0.8)' : 'transparent',
          backdropFilter: isScrolled ? 'blur(10px)' : 'none',
        }}
      >
        <div className="p-4">
          <Title level={3} className="!mb-0">
            {t("merchantPage.title")}
          </Title>
        </div>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-20">
        <div className="px-4 space-y-6">
        {/* 商家状态卡片 */}
        {isCheckingMerchant ? (
          <section className="bg-white rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-center py-4">
              <Text className="text-slate-500">{t("merchantPage.checkingStatus")}</Text>
            </div>
          </section>
        ) : isMerchant ? (
          /* 已经是商家 - 显示商家管理入口 */
          <section className="bg-white rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center">
                <span className="text-3xl">✅</span>
              </div>
              <div className="flex-1">
                <div className="text-base font-semibold text-slate-900">
                  {t("merchantPage.alreadyMerchant")}
                </div>
                <Paragraph className="!mb-1 text-xs text-slate-500">
                  {t("merchantPage.welcomeBack")}
                </Paragraph>
                <Text className="text-xs text-slate-400">
                  {t("merchantPage.manageTip")}
                </Text>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Button
                type="default"
                block
                shape="round"
                className="!border-slate-900 !text-slate-900 h-11"
                onClick={() => {
                  navigate(ROUTES.MERCHANT_CENTER);
                }}
              >
                {t("profile.links.merchant")}
              </Button>
              <Button
                type="default"
                block
                shape="round"
                className="!border-slate-900 !text-slate-900 h-11"
                onClick={() => {
                  navigate(ROUTES.MERCHANT_PRODUCT_EDIT.replace(':id', 'new'));
                }}
              >
                {t("merchantApplyResult.uploadProduct")}
              </Button>
            </div>
          </section>
        ) : (
          /* 不是商家 - 显示申请成为商家卡片 */
          <section className="bg-white rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-900/5 flex items-center justify-center">
                <span className="text-3xl">🏬</span>
              </div>
              <div className="flex-1">
                <div className="text-base font-semibold text-slate-900">
                  {t("merchantPage.applyTitle")}
                </div>
                <Paragraph className="!mb-1 text-xs text-slate-500">
                  {t("merchantPage.applySubtitle")}
                </Paragraph>
                <Text className="text-xs text-slate-400">
                  {t("merchantPage.applyTip")}
                </Text>
              </div>
            </div>
            <Button
              type="primary"
              block
              shape="round"
              className="!bg-slate-900 !border-slate-900 h-11 mt-2"
              onClick={() => navigate(ROUTES.MERCHANT_APPLY)}
              disabled={!isConnected}
            >
              {!isConnected 
                ? t("messages.connectWalletFirst")
                : t("merchantPage.applyCta")}
            </Button>
          </section>
        )}

        {/* 新入驻商家列表 */}
        <section className="space-y-4">
          <Title level={5} className="!mb-0">
            {t("merchantPage.newMerchants")}
          </Title>

          <div className="space-y-3">
            {merchants.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg px-4 py-3 flex items-center gap-4 shadow-sm"
              >
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100">
                  <img
                    src={item.cover}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900">
                    {item.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {item.category}
                  </div>
                </div>
                <Button
                  size="small"
                  shape="round"
                  className="!border-slate-900 !text-slate-900"
                >
                  {t("merchantPage.visitStore")}
                </Button>
              </div>
            ))}
          </div>
        </section>
        </div>
      </div>
    </div>
  );
}


