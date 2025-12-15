import { Button, Typography } from "antd";
import { useConnection, useConnect } from "wagmi";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ROUTES } from "@/routes";
import type { Product } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import backSvg from "@/assets/back.svg";

const { Title, Paragraph, Text } = Typography;

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

  // 处理图片 URL，优先使用 image_url，如果没有则使用 image
  const productImage = displayProduct.image_url
    ? `${API_BASE_URL}${displayProduct.image_url}`
    : displayProduct.image || "";
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
        {/* Product Image - now in scrollable area */}
        <div className="px-4 pb-4">
          <div className="rounded-[16px] overflow-hidden bg-slate-100 w-full mx-auto">
            <img
              src={productImage}
              alt={displayProduct.name}
              className="w-full h-300 object-cover"
            />
          </div>
        </div>

        <div className="px-4 space-y-4">
          <div className="bg-white rounded-lg p-5 shadow-sm space-y-3">
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
          </div>

          <div className="bg-white rounded-lg p-5 shadow-sm space-y-3">
            <Title level={5} className="!mb-1">
              {t("productDetail.introTitle")}
            </Title>
            <Paragraph className="text-sm text-slate-600 leading-relaxed !mb-0">
              {displayProduct.description || t("productDetail.placeholderDesc")}
            </Paragraph>
          </div>

          <div className="bg-white rounded-lg p-5 shadow-sm space-y-3">
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
