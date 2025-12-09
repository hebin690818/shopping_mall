import { useState, useEffect, useRef, useCallback } from "react";
import { Input, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { SearchOutlined } from "@ant-design/icons";
import { useConnection, useConnect, useSignMessage } from "wagmi";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../routes";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../lib/api";
import type { Category } from "../../lib/api";

const { Text } = Typography;


export type Product = {
  id: string;
  name: string;
  price: string;
  image: string;
};

type HomePageProps = {};

// 模拟轮播图数据
const banners = [
  "https://res.vmallres.com/uomcdn/CN/cms/202511/7f78d90653554767b041487354f41a9f.jpg",
  "https://res.vmallres.com/uomcdn/CN/cms/202511/0a2217dbd09547549291f52fc2fc4589.jpg",
  "https://res.vmallres.com/uomcdn/CN/cms/202511/13a63d469eaf4d9687b184ddeb52b749.jpg",
  "https://res.vmallres.com/uomcdn/CN/cms/202511/fafa66b2492b4cfe8b779a4dcd27a1fa.jpg",
];


// 模拟商品数据生成函数
const generateProducts = (page: number, pageSize: number = 10): Product[] => {
  return Array.from({ length: pageSize }, (_, i) => ({
    id: `product-${page}-${i + 1}`,
    name:
      i === 0
        ? "无线蓝牙耳机 pro"
        : i === 1
        ? "Smart Watch Ultra"
        : "占位符占位符占位符占...",
    price: i === 1 ? "$199.99" : "$199.99",
    image:
      "https://res8.vmallres.com/pimages/FssCdnProxy/vmall_product_uom/pmsSalesFile/428_428_D81269DA3E29C2ABF67DED5D8385E20A.png",
  }));
};

export default function HomePage({}: HomePageProps) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const { isConnected, address } = useConnection();
  const { connect, connectors, status } = useConnect();
  const { isPending: isSigning } = useSignMessage();
  // 使用认证hook，自动处理登录
  const { isAuthenticated, isLoggingIn } = useAuth();
  const [currentBanner, setCurrentBanner] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 轮播图拖拽相关
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [offset, setOffset] = useState(0);
  const bannerRef = useRef<HTMLDivElement>(null);
  const autoPlayTimerRef = useRef<number | null>(null);

  // 计算banner宽度
  const getBannerWidth = () => {
    if (bannerRef.current) {
      return bannerRef.current.offsetWidth * 0.85 + 16; // 85%宽度 + gap
    }
    return 0;
  };

  // 轮播图自动播放（仅在非拖拽状态下）
  useEffect(() => {
    if (isDragging) return;

    autoPlayTimerRef.current = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 3000);

    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
      }
    };
  }, [isDragging]);

  // 处理触摸开始
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    if (autoPlayTimerRef.current) {
      clearInterval(autoPlayTimerRef.current);
    }
  };

  // 处理触摸移动
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - startX;
    setOffset(diff);
  };

  // 处理触摸结束
  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const bannerWidth = getBannerWidth();
    const threshold = bannerWidth * 0.3; // 30%阈值

    if (Math.abs(offset) > threshold) {
      if (offset > 0 && currentBanner > 0) {
        setCurrentBanner(currentBanner - 1);
      } else if (offset < 0 && currentBanner < banners.length - 1) {
        setCurrentBanner(currentBanner + 1);
      }
    }

    setOffset(0);
    setStartX(0);
  };

  // 处理鼠标事件（桌面端）
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    if (autoPlayTimerRef.current) {
      clearInterval(autoPlayTimerRef.current);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const diff = e.clientX - startX;
    setOffset(diff);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const bannerWidth = getBannerWidth();
    const threshold = bannerWidth * 0.3;

    if (Math.abs(offset) > threshold) {
      if (offset > 0 && currentBanner > 0) {
        setCurrentBanner(currentBanner - 1);
      } else if (offset < 0 && currentBanner < banners.length - 1) {
        setCurrentBanner(currentBanner + 1);
      }
    }

    setOffset(0);
    setStartX(0);
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleMouseUp();
    }
  };

  // 获取分类数据
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const data = await api.getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // 初始加载商品
  useEffect(() => {
    const initialProducts = generateProducts(1);
    setProducts(initialProducts);
  }, []);

  // 加载更多商品
  const loadMoreProducts = useCallback(() => {
    if (loading || !hasMore) return;

    setLoading(true);
    // 模拟API请求延迟
    setTimeout(() => {
      const newProducts = generateProducts(currentPage + 1);
      if (newProducts.length === 0) {
        setHasMore(false);
      } else {
        setProducts((prev) => [...prev, ...newProducts]);
        setCurrentPage((prev) => prev + 1);
      }
      setLoading(false);
    }, 500);
  }, [currentPage, loading, hasMore]);

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
      className="min-h-screen pb-20 overflow-x-hidden"
      style={{
        backgroundImage: "url(/bg.svg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Fixed Logo Header */}
      <div
        className="fixed top-0 left-0 right-0 z-50 p-4 transition-all duration-300"
        style={{
          background: isScrolled ? "rgba(200, 223, 247, 0.8)" : "transparent",
          backdropFilter: isScrolled ? "blur(10px)" : "none",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white text-xs font-bold">
            LOGO
          </div>
          <button
            onClick={() => {
              if (!isConnected && connectors.length > 0) {
                connect({ connector: connectors[0] });
              }
            }}
            disabled={status === "pending" || (!isConnected && connectors.length === 0)}
            className={`
              relative flex items-center gap-2 px-4 py-2 rounded-full
              font-medium text-sm transition-all duration-300
              ${
                isConnected
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-105 active:scale-95"
                  : "bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg shadow-slate-900/30 hover:shadow-xl hover:shadow-slate-900/40 hover:scale-105 active:scale-95"
              }
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100
              disabled:shadow-lg
            `}
          >
            {(status === "pending" || isSigning) && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {isConnected && status !== "pending" && !isLoggingIn && (
              <span className={`w-2 h-2 rounded-full bg-white ${isAuthenticated ? 'animate-pulse' : ''}`} />
            )}
            <span className="whitespace-nowrap">
              {isConnected
                ? address
                  ? `${address.slice(0, 6)}...${address.slice(-4)}`
                  : t("wallet.connected")
                : t("wallet.connect")}
            </span>
          </button>
        </div>
      </div>

      {/* Content with padding-top to avoid logo overlap */}
      <div className="pt-[72px]">
        {/* Search Section - Scrollable */}
        <div className="px-4 pb-3" style={{ background: "transparent" }}>
          <Input
            size="large"
            placeholder={t("home.searchPlaceholder")}
            prefix={<SearchOutlined className="text-slate-400" />}
            className="!rounded-full"
          />
        </div>
        {/* Banner Carousel */}
        <div className="px-4 py-4">
          <div
            ref={bannerRef}
            className="relative overflow-hidden"
            style={{ height: "200px", width: "100%" }}
          >
            <div
              className="flex"
              style={{
                transform: `translateX(calc(-${currentBanner * 85}% + ${
                  currentBanner * 16
                }px + ${offset}px))`,
                gap: "16px",
                transition: isDragging ? "none" : "transform 0.5s ease-in-out",
                cursor: isDragging ? "grabbing" : "grab",
                userSelect: "none",
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              {banners.map((banner, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 rounded-xl overflow-hidden"
                  style={{
                    width: "85%",
                    height: "200px",
                    pointerEvents: "none",
                  }}
                >
                  <img
                    src={banner}
                    alt={`Banner ${index + 1}`}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Categories Section */}
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <Text className="text-base font-bold">
              {t("home.categories.title")}
            </Text>
          </div>
          <div className="overflow-x-auto -mx-4 px-4">
            {categoriesLoading ? (
              <div className="flex justify-center py-4">
                <Text className="text-slate-500">加载中...</Text>
              </div>
            ) : categories.length > 0 ? (
              <div className="flex gap-3" style={{ width: "max-content" }}>
                {categories.map((category) => (
                  <div key={category.id} className="flex-shrink-0 text-center">
                    <div className="w-20 h-20 rounded-lg bg-slate-200 mb-2 overflow-hidden">
                      <img
                        src={category.image}
                        alt={category.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Text className="text-xs text-slate-700">
                      {category.name}
                    </Text>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-center py-4">
                <Text className="text-slate-500">暂无分类数据</Text>
              </div>
            )}
          </div>
        </div>

        {/* Products Section */}
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <Text className="text-base font-bold">
              {t("home.products.title")}
            </Text>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="!rounded-xl shadow-sm overflow-hidden cursor-pointer"
                onClick={() => navigate(ROUTES.PRODUCT_DETAIL.replace(':id', product.id))}
              >
                <div>
                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-slate-100">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <Text className="text-sm font-medium block line-clamp-2 min-h-[2.5rem]">
                      {product.name}
                    </Text>
                    <div className="flex justify-between items-center gap-1">
                      <Text className="text-sm font-bold text-red-500 block ">
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

          {/* Load More Trigger */}
          {hasMore && (
            <div ref={loadMoreRef} className="py-4 text-center">
              {loading && <Text className="text-slate-500">加载中...</Text>}
            </div>
          )}

          {!hasMore && products.length > 0 && (
            <div className="py-4 text-center">
              <Text className="text-slate-500">没有更多商品了</Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
