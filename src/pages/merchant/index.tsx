import { useState, useEffect, useRef, useCallback } from "react";
import { Button, Typography, Spin, Empty } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/routes";
import { api } from "@/lib/api";
import type { MerchantListItem } from "@/lib/api";
import { getFirstImageUrl } from "@/lib/imageUtils";
import product from "@/assets/product.png";

const { Title, Text, Paragraph } = Typography;

export default function MerchantPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const [isScrolled, setIsScrolled] = useState(false);
  const [merchants, setMerchants] = useState<MerchantListItem[]>([]);
  const [loadingMerchants, setLoadingMerchants] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isMerchant, setIsMerchant] = useState(false);
  const [isCheckingMerchant, setIsCheckingMerchant] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 监听滚动，为固定头部添加背景色
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 初始加载商家列表
  useEffect(() => {
    let isMounted = true;

    const loadInitialMerchants = async () => {
      setLoadingMerchants(true);
      try {
        const response = await api.getActiveMerchants({
          page: 0,
          page_size: 20,
        });
        if (isMounted) {
          setMerchants(response.data || []);
          setCurrentPage(0);
          setHasMore((response.data || []).length >= 20);
        }
      } catch (error) {
        console.error("获取商家列表失败:", error);
        if (isMounted) {
          setMerchants([]);
          setHasMore(false);
        }
      } finally {
        if (isMounted) {
          setLoadingMerchants(false);
        }
      }
    };

    loadInitialMerchants();

    return () => {
      isMounted = false;
    };
  }, []);

  // 查询当前登录用户是否为商家（通过后端接口，而不是合约）
  const checkMerchantRef = useRef(false);
  useEffect(() => {
    // 防止 StrictMode 导致的重复请求
    if (checkMerchantRef.current) {
      return;
    }
    checkMerchantRef.current = true;

    let isMounted = true;

    const checkMerchantStatus = async () => {
      setIsCheckingMerchant(true);
      try {
        const merchant = await api.getMyMerchant({ force: true });
        if (isMounted) {
          setIsMerchant(!!merchant);
        }
      } catch (error: any) {
        // 忽略 AbortError，这是预期的行为（当 force: true 时会取消之前的请求）
        if (error?.name === "AbortError") {
          return;
        }
        console.error("获取我的商家信息失败:", error);
        if (isMounted) {
          setIsMerchant(false);
        }
      } finally {
        if (isMounted) {
          setIsCheckingMerchant(false);
        }
      }
    };

    checkMerchantStatus();

    return () => {
      isMounted = false;
      checkMerchantRef.current = false;
    };
  }, []);

  // 加载更多商家
  const loadMoreMerchants = useCallback(async () => {
    if (loadingMerchants || !hasMore) return;

    setLoadingMerchants(true);
    try {
      const response = await api.getActiveMerchants({
        page: currentPage + 1,
        page_size: 20,
      });

      if (response.data && response.data.length > 0) {
        setMerchants((prev) => [...prev, ...response.data]);
        setCurrentPage((prev) => prev + 1);
        setHasMore(response.data.length >= 20);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("加载更多商家失败:", error);
      setHasMore(false);
    } finally {
      setLoadingMerchants(false);
    }
  }, [currentPage, loadingMerchants, hasMore]);

  // 使用 Intersection Observer 实现滚动加载
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMerchants) {
          loadMoreMerchants();
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
  }, [hasMore, loadingMerchants, loadMoreMerchants]);

  return (
    <div
      className="min-h-screen pb-24"
      style={{
        backgroundImage: `url(${
          import.meta.env.PROD ? "/shop/bg.svg" : "/bg.svg"
        })`,
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
        <div className="p-4">
          <Title level={5} className="!mb-0">
            {t("merchantPage.title")}
          </Title>
        </div>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-20">
        <div className="px-4 space-y-6">
          {/* 商家状态卡片 */}
          {isCheckingMerchant ? (
            <section className="bg-white rounded-lg p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-center py-4">
                <Text className="text-slate-500">
                  {t("merchantPage.checkingStatus")}
                </Text>
              </div>
            </section>
          ) : isMerchant ? (
            /* 已经是商家 - 显示商家管理入口 */
            <section className="bg-white rounded-lg p-4 shadow-sm space-y-4">
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
                    navigate(
                      ROUTES.MERCHANT_PRODUCT_EDIT.replace(":id", "new")
                    );
                  }}
                >
                  {t("merchantApplyResult.uploadProduct")}
                </Button>
              </div>
            </section>
          ) : (
            /* 不是商家 - 显示申请成为商家卡片 */
            <section className="bg-white rounded-lg p-4 shadow-sm space-y-4">
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
              >
                {t("merchantPage.applyCta")}
              </Button>
            </section>
          )}

          {/* 新入驻商家列表 */}
          <section className="space-y-4">
            <Title level={5} className="!mb-0">
              {t("merchantPage.newMerchants")}
            </Title>

            {loadingMerchants && merchants.length === 0 ? (
              <div className="flex justify-center items-center py-8">
                <Spin size="large" />
              </div>
            ) : merchants.length === 0 ? (
              <div className="bg-white rounded-lg p-8">
                <Empty description={t("merchantPage.noMerchants")} />
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {merchants.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-lg px-4 py-3 flex items-center gap-4 shadow-sm"
                    >
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100">
                        <img
                          src={getFirstImageUrl(item.avatar) || product}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {item.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {item.category || item.description || ""}
                        </div>
                      </div>
                      <Button
                        size="small"
                        shape="round"
                        className="!border-slate-900 !text-slate-900"
                        onClick={() => {
                          navigate(
                            ROUTES.MERCHANT_STORE.replace(
                              ":merchantId",
                              String(item.id)
                            ),
                            {
                              state: {
                                merchantName: item.name,
                              },
                            }
                          );
                        }}
                      >
                        {t("merchantPage.visitStore")}
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Load More Trigger */}
                {hasMore && (
                  <div ref={loadMoreRef} className="py-4 text-center">
                    {loadingMerchants && (
                      <Text className="text-slate-500">
                        {t("loading.loading")}
                      </Text>
                    )}
                  </div>
                )}

                {!hasMore && merchants.length > 0 && (
                  <div className="py-4 text-center">
                    <Text className="text-slate-500">
                      {t("loading.noMoreProducts")}
                    </Text>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
