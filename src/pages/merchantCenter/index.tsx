import { useState, useEffect } from "react";
import { Button, Typography, Spin, message } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { ROUTES } from "../../routes";
import product from "@/assets/product.png";
import backSvg from "@/assets/back.svg";
import { api, type Product } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const { Title, Text } = Typography;

export type ProductStatus = "on" | "off";

export type MerchantProduct = {
  id: string;
  name: string;
  price: string;
  stock: number;
  status: ProductStatus;
  image?: string;
};

export default function MerchantCenterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation("common");
  const { address } = useAuth();
  const [activeTab, setActiveTab] = useState<"all" | "on" | "off">("all");
  const [products, setProducts] = useState<MerchantProduct[]>([]);
  const [loading, setLoading] = useState(false);

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

  // 将API返回的Product转换为MerchantProduct
  const mapProductToMerchantProduct = (product: Product): MerchantProduct => {
    return {
      id: String(product.id),
      name: product.name,
      price: product.price,
      stock: (product as any).stock ?? 0,
      status: ((product as any).status === "on" || (product as any).status === true) ? "on" : "off",
      image: product.image,
    };
  };

  // 加载商品列表
  useEffect(() => {
    let isMounted = true;

    const loadProducts = async (forceRefresh = false) => {
      if (!address) {
        if (isMounted) {
          setProducts([]);
        }
        return;
      }

      if (isMounted) {
        setLoading(true);
      }

      try {
        // 获取当前商家的商品列表，如果是从编辑页面返回则强制刷新
        const response = await api.getMyProducts({ force: forceRefresh });

        if (!isMounted) return;

        // 将API返回的商品转换为MerchantProduct格式
        const merchantProductsList = response.data.map(mapProductToMerchantProduct);
        if (isMounted) {
          setProducts(merchantProductsList);
        }
      } catch (error: any) {
        // 如果是取消的请求，不更新状态
        if (error?.name === 'AbortError') {
          return;
        }
        console.error("加载商品列表失败:", error);
        // 只在组件仍挂载时显示错误消息，避免重复提示
        if (isMounted) {
          message.error(error.message || "加载商品列表失败");
          setProducts([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // 检查是否从编辑页面返回（通过 location state 判断）
    const shouldRefresh = (location.state as any)?.refreshProducts === true;
    loadProducts(shouldRefresh);

    // 清理函数：组件卸载时清理
    return () => {
      isMounted = false;
    };
  }, [address, location.pathname, location.state]);

  // 标签切换时滚动到顶部
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-100 shadow-sm">
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
            {t("merchantCenter.title")}
          </Title>
        </div>
        {/* Fixed Tabs */}
        <div className="bg-white px-4 pb-3 flex gap-2 border-b border-slate-100">
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
      <div className="pt-[120px]">
        {/* 商品列表 */}
        <div className="px-4 py-4 space-y-4">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Spin size="large" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex justify-center items-center py-20">
              <Text className="text-slate-400">{t("merchantCenter.noProducts")}</Text>
            </div>
          ) : (
            filteredProducts.map((item) => {
            const isOn = item.status === "on";
            return (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-sm p-4 flex flex-col gap-3"
              >
                <div className="flex gap-3">
                  <img
                    src={item.image || product}
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
                      {/* <span className="text-slate-500">
                        {t("merchantCenter.stock", { count: item.stock })}
                      </span> */}
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
                    onClick={() => navigate(ROUTES.MERCHANT_PRODUCT_EDIT.replace(':id', item.id))}
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
          })
          )}
        </div>
      </div>
    </div>
  );
}
