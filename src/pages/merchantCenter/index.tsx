import { useState, useEffect } from "react";
import { Button, Typography } from "antd";
import { LeftOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import product from "@/assets/product.png";

const { Title, Text } = Typography;

export type ProductStatus = "on" | "off";

export type MerchantProduct = {
  id: string;
  name: string;
  price: string;
  stock: number;
  status: ProductStatus;
};

const initialProducts: MerchantProduct[] = [
  {
    id: "1",
    name: "无线蓝牙耳机 Pro",
    price: "299.99",
    stock: 100,
    status: "on",
  },
  {
    id: "2",
    name: "无线蓝牙耳机 Pro",
    price: "299.99",
    stock: 100,
    status: "off",
  },
  {
    id: "3",
    name: "无线蓝牙耳机 Pro",
    price: "299.99",
    stock: 100,
    status: "off",
  },
];

type MerchantCenterPageProps = {
  onBack?: () => void;
  onEditProduct?: (product: MerchantProduct) => void;
};

export default function MerchantCenterPage({
  onBack,
  onEditProduct,
}: MerchantCenterPageProps) {
  const { t } = useTranslation("common");
  const [activeTab, setActiveTab] = useState<"all" | "on" | "off">("on");
  const [products, setProducts] = useState<MerchantProduct[]>(initialProducts);

  const filteredProducts = products.filter((p) => {
    if (activeTab === "all") return true;
    if (activeTab === "on") return p.status === "on";
    return p.status === "off";
  });

  const handleToggleStatus = (id: string) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: p.status === "on" ? "off" : "on" } : p
      )
    );
  };

  // 标签切换时滚动到顶部
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="relative flex items-center justify-center p-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="返回"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-700"
            >
              <LeftOutlined />
            </button>
          )}
          <Title level={4} className="!mb-0">
            {t("merchantCenter.title")}
          </Title>
        </div>
        {/* Fixed Tabs */}
        <div className="bg-white px-4 py-3 flex gap-2 border-b border-slate-100">
          <button
            type="button"
            className={`flex-1 h-10 rounded-full text-sm ${
              activeTab === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
            onClick={() => setActiveTab("all")}
          >
            {t("merchantCenter.tabs.all")}
          </button>
          <button
            type="button"
            className={`flex-1 h-10 rounded-full text-sm ${
              activeTab === "on"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
            onClick={() => setActiveTab("on")}
          >
            {t("merchantCenter.tabs.on")}
          </button>
          <button
            type="button"
            className={`flex-1 h-10 rounded-full text-sm ${
              activeTab === "off"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
            onClick={() => setActiveTab("off")}
          >
            {t("merchantCenter.tabs.off")}
          </button>
        </div>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-[140px]">
        {/* 商品列表 */}
        <div className="px-4 py-4 space-y-4">
          {filteredProducts.map((item) => {
            const isOn = item.status === "on";
            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl shadow-sm p-4 flex flex-col gap-3"
              >
                <div className="flex gap-3">
                  <img
                    src={product}
                    alt={item.name}
                    className="w-20 h-20 rounded-2xl object-cover"
                  />
                  <div className="flex-1">
                    <Text className="block text-sm font-medium text-slate-900 mb-1">
                      {item.name}
                    </Text>
                    <Text className="block text-sm font-semibold text-slate-900 mb-1">
                      ¥{item.price}
                    </Text>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        {t("merchantCenter.stock", { count: item.stock })}
                      </span>
                      <span
                        className={`flex items-center gap-1 ${
                          isOn ? "text-emerald-500" : "text-red-500"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-current" />
                        {isOn
                          ? t("merchantCenter.statusOn")
                          : t("merchantCenter.statusOff")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <Button
                    size="small"
                    className="!rounded-full !bg-white !border-slate-300 !text-slate-900 px-5"
                    onClick={() => onEditProduct?.(item)}
                  >
                    {t("merchantCenter.edit")}
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    className="!rounded-full !bg-slate-900 !border-slate-900 px-6"
                    onClick={() => handleToggleStatus(item.id)}
                  >
                    {isOn
                      ? t("merchantCenter.actionOff")
                      : t("merchantCenter.actionOn")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
