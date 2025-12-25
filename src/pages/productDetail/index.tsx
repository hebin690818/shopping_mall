import { useState } from "react";
import { Button, Typography, Carousel } from "antd";
import { useConnection, useConnect } from "wagmi";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ROUTES } from "@/routes";
import type { Product } from "@/lib/api";
import backSvg from "@/assets/back.svg";
import { getAllImageUrls } from "@/lib/imageUtils";

const { Title, Paragraph, Text } = Typography;

// 规格类型定义
interface Specification {
  spec_name: string;
  options: string[];
  sort_order: number;
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

  // 获取商品规格
  const specifications: Specification[] =
    (displayProduct as any).specifications || [];

  // 管理每个规格的选中状态：{ specIndex: optionIndex }
  const [selectedSpecs, setSelectedSpecs] = useState<Record<number, number>>(
    {}
  );

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

  const handlePrimaryAction = () => {
    if (!isConnected) {
      if (canConnect) {
        connect({ connector: connectors[0] });
      }
      return;
    }

    navigate(ROUTES.ORDER_CONFIRM.replace(":productId", displayProduct.id), {
      state: { product: displayProduct },
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
            <div className="rounded-[16px] overflow-hidden bg-slate-100 w-full mx-auto">
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
                        className="w-auto h-[300px] object-contain"
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
                      className="flex items-center justify-between gap-2"
                    >
                      <Text className="text-sm font-semibold text-slate-800">
                        {spec.spec_name}:
                      </Text>
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
