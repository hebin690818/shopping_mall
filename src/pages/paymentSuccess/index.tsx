import { Button, Typography } from "antd";
import { LeftOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { Product } from "../home";

const { Title, Paragraph } = Typography;

type PaymentSuccessPageProps = {
  onContinue: () => void;
  onViewOrders: () => void;
  onBack?: () => void;
  recommendedProducts?: Product[];
};

const fallbackRecommendations: Product[] = [
  {
    id: "rec-1",
    name: "Smart Watch Ultra",
    price: "$199.99",
    image:
      "https://res8.vmallres.com/pimages/FssCdnProxy/vmall_product_uom/pmsSalesFile/428_428_D81269DA3E29C2ABF67DED5D8385E20A.png",
  },
  {
    id: "rec-2",
    name: "智能音箱 Mini",
    price: "$129.99",
    image:
      "https://res.vmallres.com/pimages//product/6901443503192/group/428_428_C8A31BAE9F5EEFE7F2B7D0F2E5BBD1BF.png",
  },
  {
    id: "rec-3",
    name: "复古胶片相机",
    price: "$249.99",
    image:
      "https://res8.vmallres.com/pimages/FssCdnProxy/vmall_product_uom/pmsSalesFile/428_428_9AA243525A09937DD52C6213D81A72F6.png",
  },
  {
    id: "rec-4",
    name: "轻奢香水礼盒",
    price: "$199.99",
    image:
      "https://res7.vmallres.com/pimages/FssCdnProxy/vmall_product_uom/pmsSalesFile/428_428_C8D1B2B174AB9BE5078D1A105DA956DA.png",
  },
];

export default function PaymentSuccessPage({
  onContinue,
  onViewOrders,
  onBack,
  recommendedProducts,
}: PaymentSuccessPageProps) {
  const list = recommendedProducts ?? fallbackRecommendations;
  const { t } = useTranslation("common");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-white pb-12">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-slate-100 via-white to-white shadow-sm">
        <div className="px-4 pt-8 pb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack ?? onContinue}
            aria-label="返回"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow text-slate-600"
          >
            <LeftOutlined />
          </button>
          <div className="text-lg font-semibold text-slate-900">
            {t("paymentSuccess.title")}
          </div>
        </div>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-20">
        <div className="px-4 mt-8 space-y-6">
        <div className="bg-white rounded-3xl p-8 text-center shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center text-2xl mx-auto">
            ✓
          </div>
          <Title level={3} className="!mb-0">
            {t("paymentSuccess.title")}
          </Title>
          <Paragraph className="!mb-0 text-slate-500">
            {t("paymentSuccess.processing")}
          </Paragraph>
          <div className="flex items-center gap-3 pt-2">
            <Button
              block
              shape="round"
              className="!h-12 !bg-white !border-slate-200 !text-slate-900 shadow-sm"
              onClick={onContinue}
            >
              {t("paymentSuccess.continue")}
            </Button>
            <Button
              block
              shape="round"
              className="!h-12 !bg-slate-900 !border-slate-900"
              type="primary"
              onClick={onViewOrders}
            >
              {t("paymentSuccess.viewOrders")}
            </Button>
          </div>
        </div>

        <div>
          <Title level={4} className="!mb-4 px-1">
            {t("paymentSuccess.guessYouLike")}
          </Title>
          <div className="grid grid-cols-2 gap-4">
            {list.map((item) => (
              <div key={item.id} className="bg-white rounded-3xl p-3 shadow-sm space-y-3">
                <div className="rounded-2xl overflow-hidden bg-slate-100 aspect-square">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-slate-900 text-sm">{item.name}</div>
                  <div className="text-base font-semibold text-slate-900">{item.price}</div>
                  <Button block shape="round" className="!bg-slate-900 !border-slate-900" type="primary">
                    {t("paymentSuccess.buyNow")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

