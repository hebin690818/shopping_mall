import { useState, useEffect, useRef, useCallback } from "react";
import { Typography, Spin, Empty } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "../../routes";
import { api } from "../../lib/api";
import type { Product, MerchantDetail } from "../../lib/api";
import { API_BASE_URL } from "../../lib/config";
import backSvg from "@/assets/back.svg";

const { Title, Text } = Typography;

export default function MerchantStorePage() {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const [products, setProducts] = useState<Product[]>([]);
  const [merchant, setMerchant] = useState<MerchantDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [merchantLoading, setMerchantLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 加载商家信息
  useEffect(() => {
    if (!merchantId) return;

    let isMounted = true;

    const loadMerchant = async () => {
      try {
        setMerchantLoading(true);
        const id = parseInt(merchantId, 10);
        if (isNaN(id)) {
          console.error("Invalid merchant ID");
          return;
        }
        const merchantData = await api.getMerchantById(id);
        if (isMounted && merchantData) {
          setMerchant(merchantData);
        }
      } catch (error) {
        console.error("获取商家信息失败:", error);
      } finally {
        if (isMounted) {
          setMerchantLoading(false);
        }
      }
    };

    loadMerchant();

    return () => {
      isMounted = false;
    };
  }, [merchantId]);

  // 初始加载商品
  useEffect(() => {
    if (!merchantId) return;

    let isMounted = true;

    const fetchInitialProducts = async () => {
      try {
        setLoading(true);
        const id = parseInt(merchantId, 10);
        if (isNaN(id)) {
          console.error("Invalid merchant ID");
          return;
        }
        const response = await api.getProducts({
          merchant_id: id,
          page: 1,
          page_size: 20,
        });
        if (isMounted) {
          if (response.data && response.data.length > 0) {
            setProducts(response.data);
            setCurrentPage(1);
            setHasMore(response.data.length >= 10);
          } else {
            setHasMore(false);
          }
        }
      } catch (error: any) {
        if (error?.name === "AbortError") {
          return;
        }
        console.error("获取商品列表失败:", error);
        if (isMounted) {
          setHasMore(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchInitialProducts();

    return () => {
      isMounted = false;
    };
  }, [merchantId]);

  // 加载更多商品
  const loadMoreProducts = useCallback(async () => {
    if (loading || !hasMore || !merchantId) return;

    const id = parseInt(merchantId, 10);
    if (isNaN(id)) return;

    setLoading(true);
    try {
      const response = await api.getProducts({
        merchant_id: id,
        page: currentPage + 1,
        page_size: 20,
      });

      if (response.data && response.data.length > 0) {
        setProducts((prev) => [...prev, ...response.data]);
        setCurrentPage((prev) => prev + 1);
        setHasMore(response.data.length >= 10);
      } else {
        setHasMore(false);
      }
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return;
      }
      console.error("加载更多商品失败:", error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [currentPage, loading, hasMore, merchantId]);

  // 使用 Intersection Observer 实现滚动加载
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMoreProducts();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, loadMoreProducts]);

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
      className="min-h-screen pb-24"
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
        className="fixed top-0 left-0 right-0 z-50 shadow-sm transition-all duration-300"
        style={{
          background: isScrolled ? "rgba(200, 223, 247, 0.8)" : "transparent",
          backdropFilter: isScrolled ? "blur(10px)" : "none",
        }}
      >
        <div className="flex items-center p-4 relative">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center z-10 relative"
            aria-label={t("ariaLabels.back")}
            type="button"
          >
            <img src={backSvg} alt={t("ariaLabels.back")} className="w-5 h-5" />
          </button>
          <div className="flex-1 text-center font-medium text-base text-slate-900 absolute left-0 right-0 pointer-events-none">
            {merchantLoading ? (
              <Text className="text-slate-500">{t("loading.loading")}</Text>
            ) : merchant ? (
              merchant.name
            ) : (
              t("merchantStore.title") || "商家店铺"
            )}
          </div>
        </div>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-[72px]">
        <div className="px-4 space-y-6">
          {/* 商家信息卡片 */}
          {merchant && (
            <section className="bg-white rounded-lg p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden">
                  <span className="text-3xl">🏬</span>
                </div>
                <div className="flex-1">
                  <div className="text-base font-semibold text-slate-900">
                    {merchant.name}
                  </div>
                  {merchant.description && (
                    <div className="text-xs text-slate-500 mt-1">
                      {merchant.description}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* 商品列表 */}
          <section className="space-y-4">
            {loading && products.length === 0 ? (
              <div className="flex justify-center items-center py-8">
                <Spin size="large" />
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-lg p-8">
                <Empty
                  description={t("merchantStore.noProducts") || "暂无商品"}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer"
                    onClick={() =>
                      navigate(
                        ROUTES.PRODUCT_DETAIL.replace(":id", product.id),
                        {
                          state: { product },
                        }
                      )
                    }
                  >
                    <div className="w-full aspect-square rounded-lg overflow-hidden bg-slate-100">
                      <img
                        src={`${API_BASE_URL}${
                          product.image_url || product.image
                        }`}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <Text className="text-sm font-medium block mb-1 ellipsis">
                        {product.name}
                      </Text>
                      <div className="flex justify-between items-center gap-1">
                        <Text className="text-sm font-bold text-red-500 block">
                          ${product.price}
                        </Text>
                        <div className="!rounded-full !bg-slate-800 !border-slate-800 text-xs w-auto text-center text-white py-1 px-2.5">
                          {t("home.products.buyNow")}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load More Trigger */}
            {hasMore && (
              <div ref={loadMoreRef} className="py-4 text-center">
                {loading && (
                  <Text className="text-slate-500">{t("loading.loading")}</Text>
                )}
              </div>
            )}

            {!hasMore && products.length > 0 && (
              <div className="py-4 text-center">
                <Text className="text-slate-500">
                  {t("loading.noMoreProducts")}
                </Text>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
