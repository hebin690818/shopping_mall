import { useMemo, useState } from "react";
import { Button, Typography, message } from "antd";
import { MinusOutlined, PlusOutlined, RightOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useConnection } from "wagmi";
import { ROUTES } from "../../routes";
import { useGlobalLoading } from "../../contexts/LoadingProvider";
import { useMarketContract } from "../../hooks/useMarketContract";
import { useTokenContract, useTokenQuery } from "../../hooks/useTokenContract";
import { MARKET_CONTRACT_ADDRESS } from "../../lib/config";
import { needsApproval, parseTokenAmount, formatTokenAmount } from "../../lib/contractUtils";
import backSvg from "@/assets/back.svg";
import type { Product } from "@/lib/api";

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
  const { address, isConnected } = useConnection();
  const [quantity, setQuantity] = useState(1);
  const [shippingAddress] = useState<Address | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation("common");
  
  const { createOrder } = useMarketContract();
  const { approve } = useTokenContract();
  const { useAllowance } = useTokenQuery();
  const { data: allowance } = useAllowance(address, MARKET_CONTRACT_ADDRESS);

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

  const handleSubmit = async () => {
    // 防止重复提交
    if (isSubmitting) {
      return;
    }

    if (!isConnected || !address) {
      message.error(t("messages.connectWalletFirst"));
      return;
    }

    // TODO: 从产品信息或API获取商家地址和订单ID
    // 这里使用示例地址，实际应该从产品数据中获取
    const merchantAddress = "0x0000000000000000000000000000000000000000" as const;
    const orderId = BigInt(Date.now()); // 临时使用时间戳作为订单ID，实际应该从后端获取

    setIsSubmitting(true);

    try {
      showLoading(t("loading.creatingOrder"));

      // 计算总价（使用精确计算）
      // 确保单价有足够的精度
      const priceStr = unitPrice > 0 
        ? unitPrice.toFixed(18).replace(/\.?0+$/, '')
        : "0";
      const priceWei = parseTokenAmount(priceStr);
      const totalPriceWei = priceWei * BigInt(quantity);
      
      // 计算授权金额（添加10%缓冲，避免精度问题）
      const approveAmount = (totalPriceWei * 110n) / 100n;
      const needsApprove = needsApproval(
        allowance && typeof allowance === 'bigint' ? allowance : undefined, 
        totalPriceWei
      );

      // 1. 检查并授权代币
      if (needsApprove) {
        showLoading(t("loading.approving"));
        // 使用格式化的总价字符串，确保精度
        const approveAmountStr = formatTokenAmount(approveAmount, 18, 18);
        const approveReceipt = await approve(MARKET_CONTRACT_ADDRESS, approveAmountStr);
        
        // 检查授权交易状态
        if (approveReceipt.status === "success") {
          message.success(t("messages.approveSuccess"));
        } else {
          throw new Error(t("messages.approveConfirmFailed"));
        }
      }

      // 2. 创建订单，等待交易确认
      showLoading(t("loading.creatingOrder"));
      const receipt = await createOrder(
        merchantAddress,
        BigInt(quantity),
        priceWei,
        orderId
      );

      // 检查交易状态
      if (receipt.status === "success") {
        hideLoading();
        setIsSubmitting(false);
        message.success(t("messages.orderCreateSuccess"));
        navigate(ROUTES.PAYMENT_SUCCESS);
      } else {
        throw new Error(t("messages.transactionFailed"));
      }
    } catch (error: any) {
      console.error("创建订单失败:", error);
      hideLoading();
      setIsSubmitting(false);
      const errorMessage = error?.message || error?.shortMessage || t("messages.orderCreateFailed");
      const errorStr = String(errorMessage).toLowerCase();
      if (
        errorStr.includes("rejected") ||
        errorStr.includes("denied") ||
        errorStr.includes("user rejected") ||
        errorStr.includes("user cancelled") ||
        errorStr.includes("user denied")
      ) {
        message.error(t("messages.transactionCancelled"));
      } else {
        message.error(errorMessage || t("messages.orderCreateFailed"));
      }
    }
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
              aria-label={t("ariaLabels.back")}
              type="button"
            >
              <img src={backSvg} alt={t("ariaLabels.back")} className="w-5 h-5" />
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
        <div className="space-y-4 px-4">
        <section className="bg-white rounded-lg p-5 shadow-sm">
          {shippingAddress ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-xl">
                  📦
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-500">
                    {t("checkout.shippingAddress")}
                  </div>
                  <div className="text-base font-semibold text-slate-900">{shippingAddress.name}</div>
                </div>
                <button
                  onClick={() => navigate(ROUTES.ADDRESS_EDIT)}
                  className="text-slate-500 hover:text-slate-900 transition-colors"
                  type="button"
                  aria-label={t("ariaLabels.editAddress")}
                >
                  <RightOutlined />
                </button>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 space-y-1">
                <Text className="block text-sm text-slate-900 leading-relaxed">{shippingAddress.detail}</Text>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{shippingAddress.tag}</span>
                  <span>{shippingAddress.phone}</span>
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

        <section className="bg-white rounded-lg p-5 shadow-sm space-y-4">
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
                aria-label={t("ariaLabels.decreaseQuantity")}
              >
                <MinusOutlined />
              </button>
              <span className="w-8 text-center font-semibold text-slate-900">{quantity}</span>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow text-slate-600 disabled:opacity-40"
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= 99}
                type="button"
                aria-label={t("ariaLabels.increaseQuantity")}
              >
                <PlusOutlined />
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg p-5 shadow-sm space-y-4">
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
            <div className="w-5 h-5 rounded-full border-4 border-slate-900" aria-label={t("ariaLabels.currentlySelected")} />
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
            loading={isSubmitting}
            disabled={!isConnected || isSubmitting}
          >
            {!isConnected 
              ? t("messages.connectWalletFirst")
              : isSubmitting 
              ? t("messages.processing")
              : t("checkout.payNow")}
          </Button>
        </div>
      </div>
    </div>
  );
}

