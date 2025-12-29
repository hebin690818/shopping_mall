import { useState, useEffect, useMemo } from "react";
import { Button, Typography, Carousel } from "antd";
import { useConnection, useConnect } from "wagmi";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ROUTES } from "@/routes";
import type { Product } from "@/lib/api";
import backSvg from "@/assets/back.svg";
import { getAllImageUrls } from "@/lib/imageUtils";
import { API_BASE_URL_IMAGE } from "@/lib/config";

const { Title, Paragraph, Text } = Typography;

// 规格类型定义
interface Specification {
  spec_name: string;
  options: string[];
  sort_order: number;
}

// 选择的规格值类型
interface SelectedSpecValue {
  spec_name: string;
  option_value: string;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected } = useConnection();
  const { connect, connectors, status, error } = useConnect();
  const { t } = useTranslation("common");

  // 从上一页传递的 state 中获取商品数据
  const product = (location.state as { product?: Product })?.product;
  // 如果没有传递数据，则回退到使用 id 从 API 获取（这里暂时使用 fallback）
  const displayProduct = product || {
    id: id || "default",
    name: t("loading.loading"),
    price: "$0.00",
    image: "",
    image_url: "",
  };

  // 处理图片 URL，获取所有图片用于轮播
  const imageUrlString = displayProduct.image_url || displayProduct.image || "";
  const productImages = getAllImageUrls(imageUrlString);

  // 获取详情图片
  const getDetailImages = (): string[] => {
    const detailImagesData = (displayProduct as any).detail_images;
    if (!detailImagesData) return [];

    let detailUrls: string[] = [];
    if (Array.isArray(detailImagesData)) {
      // 如果是数组，直接使用
      detailUrls = detailImagesData.filter((url: any) => url && String(url).trim());
    } else if (typeof detailImagesData === "string") {
      // 如果是字符串，尝试解析为数组或按逗号分割
      try {
        const parsed = JSON.parse(detailImagesData);
        if (Array.isArray(parsed)) {
          detailUrls = parsed.filter((url: any) => url && String(url).trim());
        } else {
          // 使用 getAllImageUrls 处理逗号分隔的字符串
          detailUrls = getAllImageUrls(detailImagesData);
        }
      } catch {
        // 解析失败，使用 getAllImageUrls 处理逗号分隔的字符串
        detailUrls = getAllImageUrls(detailImagesData);
      }
    }

    // 处理每个URL，如果是完整URL直接返回，否则拼接API_BASE_URL_IMAGE
    return detailUrls.map((url) => 
      url.startsWith("http") ? url : `${API_BASE_URL_IMAGE}${url}`
    );
  };

  const detailImages = getDetailImages();

  // 获取商品规格
  const specifications: Specification[] =
    (displayProduct as any).specifications || [];

  // 默认选择每个规格的第一个选项
  const defaultSelectedSpecs = useMemo(() => {
    const defaultSpecs: Record<number, number> = {};
    specifications
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((spec, specIndex) => {
        if (spec.options.length > 0) {
          defaultSpecs[specIndex] = 0; // 默认选择第一个选项
        }
      });
    return defaultSpecs;
  }, [specifications]);

  // 管理每个规格的选中状态：{ specIndex: optionIndex }
  const [selectedSpecs, setSelectedSpecs] = useState<Record<number, number>>(
    defaultSelectedSpecs
  );

  // 当规格变化时，更新默认选择
  useEffect(() => {
    setSelectedSpecs(defaultSelectedSpecs);
  }, [defaultSelectedSpecs]);

  // 处理规格选项选择（单选：点击已选中的会取消选择）
  const handleSpecOptionClick = (specIndex: number, optionIndex: number) => {
    setSelectedSpecs((prev) => {
      const newState = { ...prev };
      if (prev[specIndex] === optionIndex) {
        // 如果点击的是已选中的，则取消选择
        delete newState[specIndex];
      } else {
        // 否则选中该选项
        newState[specIndex] = optionIndex;
      }
      return newState;
    });
  };

  const actionLabel = isConnected
    ? t("productDetail.buyNow")
    : t("productDetail.connectWallet");
  const isConnecting = status === "pending";
  const canConnect = connectors.length > 0;

  // 将选择的规格转换为数组格式
  const getSelectedSpecsArray = (): SelectedSpecValue[] => {
    const sortedSpecs = specifications.sort(
      (a, b) => a.sort_order - b.sort_order
    );
    return sortedSpecs
      .map((spec, specIndex) => {
        const selectedOptionIndex = selectedSpecs[specIndex];
        if (
          selectedOptionIndex !== undefined &&
          spec.options[selectedOptionIndex]
        ) {
          return {
            spec_name: spec.spec_name,
            option_value: spec.options[selectedOptionIndex],
          };
        }
        return null;
      })
      .filter((spec): spec is SelectedSpecValue => spec !== null);
  };

  const handlePrimaryAction = () => {
    if (!isConnected) {
      if (canConnect) {
        // 优先选择 OKX 钱包（如果可用）
        const okxConnector = connectors.find(
          (c) => c.id === 'okx' || c.name?.toLowerCase().includes('okx')
        );
        const connectorToUse = okxConnector || connectors[0];
        connect({ connector: connectorToUse });
      }
      return;
    }

    // 获取选择的规格
    const selectedSpecsArray = getSelectedSpecsArray();

    navigate(ROUTES.ORDER_CONFIRM.replace(":productId", displayProduct.id), {
      state: {
        product: displayProduct,
        selectedSpecs: selectedSpecsArray,
      },
    });
  };

  return (
    <div className=" bg-slate-50 pb-20">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
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
            {t("productDetail.title")}
          </div>
        </div>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-[72px]">
        {/* Product Image Carousel */}
        <div className="px-4 pb-4">
          {productImages.length > 0 ? (
            <div className="rounded-[16px] overflow-hidden w-full mx-auto">
              <Carousel
                dots={productImages.length > 1}
                className="product-carousel"
              >
                {productImages.map((imageUrl, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-center">
                      <img
                        src={imageUrl}
                        alt={`${displayProduct.name} - ${index + 1}`}
                        className="w-auto h-[240px] object-contain"
                      />
                    </div>
                  </div>
                ))}
              </Carousel>
            </div>
          ) : (
            <div className="rounded-[16px] overflow-hidden bg-slate-100 w-full h-[300px] flex items-center justify-center">
              <Text className="text-slate-400">暂无图片</Text>
            </div>
          )}
        </div>

        <div className="px-4 space-y-4">
          <div className="bg-white rounded-lg p-4 shadow-sm space-y-3">
            <Title level={5} className="!mb-0">
              {displayProduct.name}
            </Title>
            <div className="flex items-center justify-between">
              <Text className="text-2xl font-semibold text-slate-900">
                ${displayProduct.price}
              </Text>
              {/* <Text className="text-xs text-slate-500">
                {t("productDetail.stock", { count: 60 })}
              </Text> */}
            </div>
            {/* 商品规格 */}
            {specifications.length > 0 && (
              <div className="space-y-4 pt-3 border-t border-slate-100">
                {specifications
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((spec, specIndex) => (
                    <div
                      key={specIndex}
                      className="flex items-start flex-col gap-2"
                    >
                      <div className="text-sm font-semibold text-slate-800 text-left">
                        {spec.spec_name}:
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {spec.options.map((option, optionIndex) => {
                          const isSelected =
                            selectedSpecs[specIndex] === optionIndex;
                          return (
                            <button
                              key={optionIndex}
                              type="button"
                              onClick={() =>
                                handleSpecOptionClick(specIndex, optionIndex)
                              }
                              className={`
                                px-2 py-1 rounded-lg text-sm font-medium transition-all duration-200
                                border-2 min-w-[70px] text-center cursor-pointer
                                active:scale-95
                                ${
                                  isSelected
                                    ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20 scale-[1.02]"
                                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
                                }
                              `}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm space-y-3">
            <Title level={5} className="!mb-1">
              {t("productDetail.introTitle")}
            </Title>
            <Paragraph className="text-sm text-slate-600 leading-relaxed !mb-0">
              {displayProduct.description || t("productDetail.placeholderDesc")}
            </Paragraph>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm space-y-3">
            <Title level={5} className="!mb-1">
              {t("productDetail.deliveryTitle")}
            </Title>
            <ul className="text-sm text-slate-600 space-y-1 list-disc pl-5">
              <li>{t("productDetail.deliveryFree")}</li>
              <li>{t("productDetail.deliveryTime")}</li>
              <li>{t("productDetail.deliveryFast")}</li>
            </ul>
          </div>

          {/* 详情图片 */}
          {detailImages.length > 0 && (
            <div className="bg-white rounded-lg p-4 shadow-sm space-y-3">
              <Title level={5} className="!mb-1">
                {t("productDetail.detailImagesTitle") || "商品详情图片"}
              </Title>
              <div className="space-y-3">
                {detailImages.map((imageUrl, index) => (
                  <div
                    key={index}
                    className="rounded-lg overflow-hidden bg-slate-50"
                  >
                    <img
                      src={imageUrl}
                      alt={`${displayProduct.name} - 详情 ${index + 1}`}
                      className="w-full h-auto object-contain"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <Text className="text-xs text-red-500 block px-1">
              {error.message}
            </Text>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-4">
        <Button
          type="primary"
          block
          shape="round"
          size="large"
          className="!bg-slate-900 !border-slate-900"
          onClick={handlePrimaryAction}
          loading={isConnecting}
          disabled={!isConnected && !canConnect}
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
