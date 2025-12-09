import { Button, Typography } from "antd";
import { useConnection, useConnect } from "wagmi";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "../../routes";
import type { Product } from "../home";
import backSvg from "@/assets/back.svg";

const { Title, Paragraph, Text } = Typography;

// 模拟商品数据 - 实际应该从API获取
const mockProducts: Product[] = [
  {
    id: "product-1-1",
    name: "无线蓝牙耳机 pro",
    price: "$199.99",
    image:
      "https://res8.vmallres.com/pimages/FssCdnProxy/vmall_product_uom/pmsSalesFile/428_428_D81269DA3E29C2ABF67DED5D8385E20A.png",
  },
  {
    id: "product-1-2",
    name: "Smart Watch Ultra",
    price: "$199.99",
    image:
      "https://res8.vmallres.com/pimages/FssCdnProxy/vmall_product_uom/pmsSalesFile/428_428_D81269DA3E29C2ABF67DED5D8385E20A.png",
  },
];

const fallbackProduct: Product = {
  id: "default",
  name: "无线蓝牙耳机 Pro",
  price: "$299.99",
  image:
    "https://res8.vmallres.com/pimages/FssCdnProxy/vmall_product_uom/pmsSalesFile/428_428_D81269DA3E29C2ABF67DED5D8385E20A.png",
};

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isConnected } = useConnection();
  const { connect, connectors, status, error } = useConnect();
  const { t } = useTranslation("common");

  // 从模拟数据中查找商品，实际应该从API获取
  const product = mockProducts.find((p) => p.id === id) || fallbackProduct;
  const displayProduct = product;
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

    navigate(ROUTES.ORDER_CONFIRM.replace(":productId", displayProduct.id));
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
        <div className="flex items-center p-4 relative">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center z-10 relative"
            aria-label="返回"
            type="button"
          >
            <img src={backSvg} alt="返回" className="w-5 h-5" />
          </button>
          <div className="flex-1 text-center font-medium text-base text-slate-900 absolute left-0 right-0 pointer-events-none">
            {t("productDetail.title")}
          </div>
        </div>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-[100px]">
        {/* Product Image - now in scrollable area */}
        <div className="px-6 pb-6">
          <div className="rounded-[32px] overflow-hidden bg-slate-100 w-full aspect-[3/4] mx-auto">
            <img
              src={displayProduct.image}
              alt={displayProduct.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="px-4 py-6 space-y-4">
          <div className="bg-white rounded-3xl p-5 shadow-sm space-y-3">
            <Title level={4} className="!mb-0">
              {displayProduct.name}
            </Title>
            <Paragraph className="!mb-0 text-slate-500 text-sm leading-relaxed">
              {t("productDetail.placeholderDesc")}
            </Paragraph>
            <div className="flex items-center justify-between">
              <Text className="text-2xl font-semibold text-slate-900">
                {displayProduct.price}
              </Text>
              <Text className="text-xs text-slate-500">
                {t("productDetail.stock", { count: 60 })}
              </Text>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm space-y-3">
            <Title level={5} className="!mb-1">
              {t("productDetail.introTitle")}
            </Title>
            <Paragraph className="text-sm text-slate-600 leading-relaxed !mb-0">
              {t("productDetail.intro1")}
            </Paragraph>
            <Paragraph className="text-sm text-slate-600 leading-relaxed !mb-0">
              {t("productDetail.intro2")}
            </Paragraph>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm space-y-3">
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
