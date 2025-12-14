import { useState, useEffect } from "react";
import { Button, Typography, Spin, message, Modal } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { ROUTES } from "../../routes";
import backSvg from "@/assets/back.svg";
import { api, type Product } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/lib/config";

const { Title, Text } = Typography;

export type ProductStatus = "on" | "off";

export type MerchantProduct = {
  id: string;
  name: string;
  price: string;
  stock: number;
  status: ProductStatus;
  image_url?: string;
  // 保存原始商品数据，用于更新状态时调用API
  originalProduct?: Product;
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

  // 将API返回的Product转换为MerchantProduct
  const mapProductToMerchantProduct = (product: Product): MerchantProduct => {
    // status: 'published' 为上架，否则为下架
    const apiStatus = (product as any).status;
    const isPublished = apiStatus === "published";
    
    return {
      id: String(product.id),
      name: product.name,
      price: product.price,
      stock: (product as any).stock ?? 0,
      status: isPublished ? "on" : "off",
      image_url: product.image_url,
      originalProduct: product, // 保存原始商品数据
    };
  };

  // 加载商品列表
  const loadProducts = async (forceRefresh = false) => {
    if (!address) {
      setProducts([]);
      return;
    }

    setLoading(true);

    try {
      // 获取当前商家的商品列表，如果是从编辑页面返回则强制刷新
      const response = await api.getMyProducts({ force: forceRefresh });

      // 将API返回的商品转换为MerchantProduct格式
      const merchantProductsList = response.data.map(
        mapProductToMerchantProduct
      );
      setProducts(merchantProductsList);
    } catch (error: any) {
      // 如果是取消的请求，不更新状态
      if (error?.name === "AbortError") {
        return;
      }
      console.error("加载商品列表失败:", error);
      message.error(error.message || "加载商品列表失败");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    // 获取当前商品信息
    const product = products.find((p) => p.id === id);
    if (!product || !product.originalProduct) {
      message.error("商品信息不完整");
      return;
    }

    const currentStatus = product.status;
    const newStatus = currentStatus === "on" ? "off" : "on";
    const actionText = newStatus === "on" ? "上架" : "下架";

    // 二次确认
    Modal.confirm({
      title: `确认${actionText}商品`,
      content: `确定要${actionText}商品"${product.name}"吗？`,
      okText: "确认",
      cancelText: "取消",
      centered: true,
      onOk: async () => {
        // 再次获取商品信息，确保数据是最新的
        const currentProduct = products.find((p) => p.id === id);
        if (!currentProduct || !currentProduct.originalProduct) {
          message.error("商品信息不完整");
          return;
        }

        // API状态：'published' 为上架，其他为下架
        const newApiStatus = newStatus === "on" ? "published" : "unpublished";

        try {
          // 获取商品完整信息以调用更新API
          const productId = parseInt(id, 10);
          if (isNaN(productId)) {
            throw new Error("无效的商品ID");
          }

          const originalProduct = currentProduct.originalProduct;
          
          // 调用API更新商品状态
          await api.updateProduct({
            id: productId,
            category_id: originalProduct.category_id || 0,
            description: (originalProduct as any).description || "",
            image_url: originalProduct.image_url || "",
            name: originalProduct.name,
            price: typeof originalProduct.price === "string" 
              ? parseFloat(originalProduct.price) || 0 
              : (originalProduct.price as number) || 0,
            status: newApiStatus,
          });

          // 重新获取商品列表数据
          await loadProducts(true);

          message.success(
            newStatus === "on" ? "商品已上架" : "商品已下架"
          );
        } catch (error: any) {
          console.error("更新商品状态失败:", error);
          message.error(error.message || "更新商品状态失败");
        }
      },
    });
  };

  // 加载商品列表
  useEffect(() => {
    let isMounted = true;

    const loadProductsWithMountCheck = async (forceRefresh = false) => {
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
        const merchantProductsList = response.data.map(
          mapProductToMerchantProduct
        );
        if (isMounted) {
          setProducts(merchantProductsList);
        }
      } catch (error: any) {
        // 如果是取消的请求，不更新状态
        if (error?.name === "AbortError") {
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
    loadProductsWithMountCheck(shouldRefresh);

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
    <div className="min-h-screen bg-slate-50 pb-4">
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
        <div
          className="px-4 pb-3 flex gap-2 overflow-x-auto"
          style={{ background: "transparent" }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1 rounded-full text-[12px] whitespace-nowrap transition-colors flex-shrink-0 ${
              activeTab === "all"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600"
            }`}
          >
            {t("merchantCenter.tabs.all")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("on")}
            className={`px-3 py-1 rounded-full text-[12px] whitespace-nowrap transition-colors flex-shrink-0 ${
              activeTab === "on"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600"
            }`}
          >
            {t("merchantCenter.tabs.on")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("off")}
            className={`px-3 py-1 rounded-full text-[12px] whitespace-nowrap transition-colors flex-shrink-0 ${
              activeTab === "off"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600"
            }`}
          >
            {t("merchantCenter.tabs.off")}
          </button>
        </div>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-[100px]">
        {/* 商品列表 */}
        <div className="px-4 py-4 space-y-4">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Spin size="large" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex justify-center items-center py-20">
              <Text className="text-slate-400">
                {t("merchantCenter.noProducts")}
              </Text>
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
                      src={`${API_BASE_URL}${item.image_url}`}
                      alt={item.name}
                      className="w-20 h-20 rounded-2xl object-cover"
                    />
                    <div className="flex-1">
                      <Text className="block text-sm font-medium text-slate-900 mb-1">
                        {item.name}
                      </Text>
                      <Text className="block text-sm font-semibold text-slate-900 mb-1">
                        ${item.price}
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

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="default"
                      size="small"
                      className="!text-slate-600 !border-slate-300 p-4"
                      onClick={() =>
                        navigate(
                          ROUTES.MERCHANT_PRODUCT_EDIT.replace(":id", item.id)
                        )
                      }
                    >
                      {t("merchantCenter.edit")}
                    </Button>
                    <Button
                      type="primary"
                      size="small"
                      className="!bg-slate-900 !border-slate-900 p-4"
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
