import { useMemo, useState, useRef } from "react";
import { Button, Typography } from "antd";
import { MinusOutlined, PlusOutlined, RightOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "../../routes";
import { useGlobalLoading } from "../../contexts/LoadingProvider";
import type { Product } from "../home";
import backSvg from "@/assets/back.svg";

const { Title, Text } = Typography;

type Address = {
  name: string;
  phone: string;
  detail: string;
  tag: string;
};

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

export default function OrderConfirmPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { showLoading, hideLoading } = useGlobalLoading();
  const [quantity, setQuantity] = useState(1);
  const [address] = useState<Address | null>(null);
  const { t } = useTranslation("common");

  // 从模拟数据中查找商品，实际应该从API获取
  const product = mockProducts.find((p) => p.id === productId) || fallbackProduct;

  const unitPrice = useMemo(() => {
    const value = parseFloat(product.price.replace(/[^\d.]/g, ""));
    return Number.isNaN(value) ? 0 : value;
  }, [product.price]);

  const formattedUnitPrice = useMemo(() => {
    const symbol = product.price.trim().charAt(0) === "$" ? "$" : "$";
    return `${symbol}${unitPrice.toFixed(2)}`;
  }, [product.price, unitPrice]);

  const total = unitPrice * quantity;
  const formattedTotal = `$${total.toFixed(2)}`;

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < 1) {
        return 1;
      }
      if (next > 99) {
        return 99;
      }
      return next;
    });
  };

  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSubmit = () => {
    showLoading(t("globalLoading.defaultMessage"));
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }
    loadingTimerRef.current = setTimeout(() => {
      hideLoading();
      navigate(ROUTES.PAYMENT_SUCCESS);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-white pb-28">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-slate-100 via-white to-white shadow-sm">
        <div className="p-4">
          <div className="relative flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center z-10"
              aria-label="返回"
              type="button"
            >
              <img src={backSvg} alt="返回" className="w-5 h-5" />
            </button>
            <div className="flex-1 text-center text-lg font-semibold text-slate-900">
              {t("checkout.title")}
            </div>
            <div className="w-10" />
          </div>
        </div>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-20">
        <div className="mt-6 space-y-4 px-4">
        <section className="bg-white rounded-3xl p-5 shadow-sm">
          {address ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-xl">
                  📦
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-500">
                    {t("checkout.shippingAddress")}
                  </div>
                  <div className="text-base font-semibold text-slate-900">{address.name}</div>
                </div>
                <button
                  onClick={() => navigate(ROUTES.ADDRESS_EDIT)}
                  className="text-slate-500 hover:text-slate-900 transition-colors"
                  type="button"
                  aria-label="编辑地址"
                >
                  <RightOutlined />
                </button>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 space-y-1">
                <Text className="block text-sm text-slate-900 leading-relaxed">{address.detail}</Text>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{address.tag}</span>
                  <span>{address.phone}</span>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => navigate(ROUTES.ADDRESS_EDIT)}
              className="w-full text-left space-y-3"
              type="button"
            >
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xl">
                  📦
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-500">
                    {t("checkout.shippingAddress")}
                  </div>
                  <div className="text-base font-semibold text-slate-400">{t("checkout.addAddress")}</div>
                </div>
                <RightOutlined className="text-slate-400" />
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border-2 border-dashed border-slate-200">
                <Text className="block text-sm text-slate-400 text-center leading-relaxed">
                  {t("checkout.addAddressTip")}
                </Text>
              </div>
            </button>
          )}
        </section>

        <section className="bg-white rounded-3xl p-5 shadow-sm space-y-4">
          <Title level={5} className="!mb-0">
            {t("checkout.orderDetail")}
          </Title>

          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="font-semibold text-slate-900">{product.name}</div>
              <div className="text-xs text-slate-500">
                {t("checkout.presale")}
              </div>
              <div className="text-lg font-semibold text-slate-900">{formattedUnitPrice}</div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">
              {t("checkout.quantity")}
            </span>
            <div className="flex items-center gap-3 bg-slate-100 rounded-full px-3 py-1">
              <button
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow text-slate-600 disabled:opacity-40"
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                type="button"
                aria-label="减少数量"
              >
                <MinusOutlined />
              </button>
              <span className="w-8 text-center font-semibold text-slate-900">{quantity}</span>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow text-slate-600 disabled:opacity-40"
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= 99}
                type="button"
                aria-label="增加数量"
              >
                <PlusOutlined />
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl p-5 shadow-sm space-y-4">
          <Title level={5} className="!mb-0">
            {t("checkout.payMethod")}
          </Title>

          <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-inner">
                <img
                  src="https://cryptologos.cc/logos/tether-usdt-logo.png?v=032"
                  alt="USDT"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div>
                <div className="font-semibold text-slate-900">
                  {t("checkout.usdtPay")}
                </div>
                <div className="text-xs text-slate-500">
                  {t("checkout.usdtDesc")}
                </div>
              </div>
            </div>
            <div className="w-5 h-5 rounded-full border-4 border-slate-900" aria-label="当前选中" />
          </div>
        </section>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-5 py-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="text-xs text-slate-500">
              {t("checkout.totalLabel")}
            </div>
            <div className="text-2xl font-semibold text-slate-900">{formattedTotal}</div>
          </div>
          <Button
            type="primary"
            shape="round"
            size="large"
            className="!bg-slate-900 !border-slate-900 w-40"
            onClick={handleSubmit}
          >
            {t("checkout.payNow")}
          </Button>
        </div>
      </div>
    </div>
  );
}

