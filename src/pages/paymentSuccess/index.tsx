import { Button, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { ROUTES } from "@/routes";
import backSvg from "@/assets/back.svg";
import { api, type Product } from "@/lib/api";
import { getFirstImageUrl } from "@/lib/imageUtils";

const { Title, Text } = Typography;

type PaymentSuccessPageProps = {
  recommendedProducts?: Product[];
};

export default function PaymentSuccessPage({
  recommendedProducts,
}: PaymentSuccessPageProps) {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const [list, setList] = useState<Product[]>(recommendedProducts ?? []);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 初始加载商品列表
  useEffect(() => {
    // 如果已经传入了推荐商品，就不需要从API获取
    if (recommendedProducts) {
      return;
    }

    let isMounted = true;

    const fetchInitialProducts = async () => {
      try {
        setLoading(true);
        const response = await api.getProducts({
          sort: "sales_count",
          page: 1,
          page_size: 20,
        });

        if (isMounted) {
          if (response.data && response.data.length > 0) {
            setList(response.data);
            setCurrentPage(1);
            setHasMore(response.data.length >= 20);
          } else {
            setHasMore(false);
          }
        }
      } catch (error: any) {
        if (error?.name === "AbortError") {
          return;
        }
        console.error("获取推荐商品失败:", error);
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
  }, [recommendedProducts]);

  // 加载更多商品
  const loadMoreProducts = useCallback(async () => {
    if (loading || !hasMore || recommendedProducts) return;

    setLoading(true);
    try {
      const response = await api.getProducts({
        sort: "sales_count",
        page: currentPage + 1,
        page_size: 20,
      });

      if (response.data && response.data.length > 0) {
        setList((prev) => [...prev, ...response.data]);
        setCurrentPage((prev) => prev + 1);
        setHasMore(response.data.length >= 20);
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
  }, [currentPage, loading, hasMore, recommendedProducts]);

  // 使用 Intersection Observer 实现滚动加载
  useEffect(() => {
    if (recommendedProducts) return;

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
  }, [hasMore, loading, loadMoreProducts, recommendedProducts]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-white pb-12">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-slate-100 via-white to-white shadow-sm">
        <div className="p-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(ROUTES.HOME)}
            aria-label={t("ariaLabels.back")}
            className="flex items-center justify-center z-10"
          >
            <img src={backSvg} alt={t("ariaLabels.back")} className="w-5 h-5" />
          </button>
          <div className="text-base font-semibold text-slate-900">
            {t("paymentSuccess.title")}
          </div>
        </div>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-[72px]">
        <div className="px-4 space-y-6">
          <div className="bg-white rounded-lg p-4 text-center shadow-sm space-y-4">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xl mx-auto">
              ✓
            </div>
            <Title level={3} className="!mb-0">
              {t("paymentSuccess.title")}
            </Title>
            <div className="flex items-center gap-3 pt-2">
              <Button
                block
                shape="round"
                className="!h-12 !bg-white !border-slate-200 !text-slate-900 shadow-sm"
                onClick={() => navigate(ROUTES.HOME)}
              >
                {t("paymentSuccess.continue")}
              </Button>
              <Button
                block
                shape="round"
                className="!h-12 !bg-slate-900 !border-slate-900"
                type="primary"
                onClick={() => navigate(ROUTES.ORDERS, { state: { refresh: true } })}
              >
                {t("paymentSuccess.viewOrders")}
              </Button>
            </div>
          </div>

          <div>
            <Title level={5} className="!mb-4 px-1">
              {t("paymentSuccess.guessYouLike")}
            </Title>
            <div className="grid grid-cols-2 gap-4">
              {list.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg p-3 shadow-sm space-y-3"
                >
                  <div className="rounded-2xl overflow-hidden bg-slate-100 aspect-square">
                    <img
                      src={getFirstImageUrl((item as any).image_url || item.image)}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium text-slate-900 text-sm truncate">
                      {item.name}
                    </div>
                    <div className="text-base font-semibold text-slate-900">
                      {item.price}
                    </div>
                    <Button
                      block
                      shape="round"
                      className="!bg-slate-900 !border-slate-900"
                      type="primary"
                    >
                      {t("paymentSuccess.buyNow")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Trigger */}
            {!recommendedProducts && hasMore && (
              <div ref={loadMoreRef} className="py-4 text-center">
                {loading && (
                  <Text className="text-slate-500">{t("loading.loading")}</Text>
                )}
              </div>
            )}

            {!recommendedProducts && !hasMore && list.length > 0 && (
              <div className="py-4 text-center">
                <Text className="text-slate-500">
                  {t("loading.noMoreProducts")}
                </Text>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
