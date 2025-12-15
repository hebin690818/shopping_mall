import { useState, useEffect, useRef, useCallback } from "react";
import { Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "@/routes";
import { api } from "@/lib/api";
import type { Product, Category } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import backSvg from "@/assets/back.svg";

const { Text, Title } = Typography;

export default function CategoryProductsPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 获取分类信息
  useEffect(() => {
    let isMounted = true;

    const fetchCategory = async () => {
      try {
        const categories = await api.getCategories();
        const foundCategory = categories.find(
          (cat) => String(cat.id) === String(categoryId)
        );
        if (isMounted) {
          setCategory(foundCategory || null);
        }
      } catch (error) {
        console.error("Failed to fetch category:", error);
      }
    };

    fetchCategory();

    return () => {
      isMounted = false;
    };
  }, [categoryId]);

  // 初始加载商品
  useEffect(() => {
    let isMounted = true;

    const fetchInitialProducts = async () => {
      if (!categoryId) return;

      try {
        setLoading(true);
        const response = await api.getProducts({
          category_id: Number(categoryId),
          page: 1,
          page_size: 20,
        });
        if (isMounted) {
          if (response.data && response.data.length > 0) {
            setProducts(response.data);
            setCurrentPage(1);
            setHasMore(response.data.length >= 20);
          } else {
            setProducts([]);
            setCurrentPage(1);
            setHasMore(false);
          }
        }
      } catch (error: any) {
        if (error?.name === "AbortError") {
          return;
        }
        console.error("Failed to fetch products:", error);
        if (isMounted) {
          setProducts([]);
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
  }, [categoryId]);

  // 加载更多商品
  const loadMoreProducts = useCallback(async () => {
    if (loading || !hasMore || !categoryId) return;

    setLoading(true);
    try {
      const response = await api.getProducts({
        category_id: Number(categoryId),
        page: currentPage + 1,
        page_size: 20,
      });

      if (response.data && response.data.length > 0) {
        setProducts((prev) => [...prev, ...response.data]);
        setCurrentPage((prev) => prev + 1);
        setHasMore(response.data.length >= 20);
      } else {
        setHasMore(false);
      }
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return;
      }
      console.error("Failed to load more products:", error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [currentPage, loading, hasMore, categoryId]);

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

  return (
    <div
      className="min-h-screen pb-20 overflow-x-hidden"
      style={{
        backgroundImage: "url(/bg.svg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
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
            {category?.name || t("home.categories.title")}
          </Title>
        </div>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-[72px]">
        {/* Products Section */}
        <div className="px-4">
          {loading && products.length === 0 ? (
            <div className="flex justify-center py-8">
              <Text className="text-slate-500">{t("loading.loading")}</Text>
            </div>
          ) : products.length === 0 ? (
            <div className="flex justify-center py-8">
              <Text className="text-slate-500">{t("loading.noProducts")}</Text>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="!rounded-xl shadow-sm overflow-hidden cursor-pointer"
                  onClick={() =>
                    navigate(ROUTES.PRODUCT_DETAIL.replace(":id", product.id), {
                      state: { product },
                    })
                  }
                >
                  <div>
                    <div className="w-full aspect-square rounded-lg overflow-hidden bg-slate-100">
                      <img
                        src={`${API_BASE_URL}${product.image_url || product.image}`}
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
                          {product.price}
                        </Text>
                        <div className="!rounded-full !bg-slate-800 !border-slate-800 text-xs w-auto text-center text-white py-1 px-2.5">
                          {t("home.products.buyNow")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More Trigger */}
          {hasMore && products.length > 0 && (
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
        </div>
      </div>
    </div>
  );
}

