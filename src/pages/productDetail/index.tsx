import { Button, Typography } from "antd";
import { LeftOutlined } from "@ant-design/icons";
import { useAccount, useConnect } from "wagmi";
import type { Product } from "../home";

const { Title, Paragraph, Text } = Typography;

type ProductDetailPageProps = {
  product: Product | null;
  onBack: () => void;
  onPurchase?: (product: Product) => void;
};

const fallbackProduct: Product = {
  id: "default",
  name: "无线蓝牙耳机 Pro",
  price: "$299.99",
  image:
    "https://res8.vmallres.com/pimages/FssCdnProxy/vmall_product_uom/pmsSalesFile/428_428_D81269DA3E29C2ABF67DED5D8385E20A.png",
};

export default function ProductDetailPage({
  product,
  onBack,
  onPurchase,
}: ProductDetailPageProps) {
  const { isConnected } = useAccount();
  const { connect, connectors, status, error } = useConnect();

  const displayProduct = product ?? fallbackProduct;
  const actionLabel = isConnected ? "立即购买" : "链接钱包";
  const isConnecting = status === "pending";
  const canConnect = connectors.length > 0;

  const handlePrimaryAction = () => {
    if (!isConnected) {
      if (canConnect) {
        connect({ connector: connectors[0] });
      }
      return;
    }

    onPurchase?.(displayProduct);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <div className="bg-white rounded-b-3xl shadow-sm">
        <div className="flex items-center px-4 pt-10 pb-4 relative">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors z-10 relative"
            aria-label="返回"
            type="button"
          >
            <LeftOutlined />
          </button>
          <div className="flex-1 text-center font-medium text-base text-slate-900 absolute left-0 right-0 pointer-events-none">
            商品详情
          </div>
        </div>
        <div className="px-6 pb-6">
          <div className="rounded-[32px] overflow-hidden bg-slate-100 w-full aspect-[3/4] mx-auto">
            <img
              src={displayProduct.image}
              alt={displayProduct.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
        <div className="bg-white rounded-3xl p-5 shadow-sm space-y-3">
          <Title level={4} className="!mb-0">
            {displayProduct.name}
          </Title>
          <Paragraph className="!mb-0 text-slate-500 text-sm leading-relaxed">
            占位符占位符占位符占位符占位符占位符占位符占位符
          </Paragraph>
          <div className="flex items-center justify-between">
            <Text className="text-2xl font-semibold text-slate-900">
              {displayProduct.price}
            </Text>
            <Text className="text-xs text-slate-500">库存: 60件</Text>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm space-y-3">
          <Title level={5} className="!mb-1">
            商品介绍
          </Title>
          <Paragraph className="text-sm text-slate-600 leading-relaxed !mb-0">
            这是一款精心设计的高品质商品，采用优质材料制作，具有出色的性能和质感。无论是日常使用还是专业需求，都能带来理想体验。
          </Paragraph>
          <Paragraph className="text-sm text-slate-600 leading-relaxed !mb-0">
            我们的产品经过严格的品质检测，确保每一件商品都达到高标准。购买即享受完善的售后服务和保障。
          </Paragraph>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm space-y-3">
          <Title level={5} className="!mb-1">
            配送信息
          </Title>
          <ul className="text-sm text-slate-600 space-y-1 list-disc pl-5">
            <li>免费配送</li>
            <li>预计 2~3 个工作日送达</li>
            <li>支持极速发货</li>
          </ul>
        </div>

        {error && (
          <Text className="text-xs text-red-500 block px-1">
            {error.message}
          </Text>
        )}
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

