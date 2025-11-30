import { Button, Form, Input, Typography } from "antd";
import { LeftOutlined, PlusOutlined, CloseCircleFilled } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { MerchantProduct } from "../merchantCenter";
import productImg from "@/assets/product.png";

const { Title, Text } = Typography;

type MerchantProductEditPageProps = {
  product?: MerchantProduct | null;
  onBack?: () => void;
  onSave?: (values: { name: string; description?: string; price: string }) => void;
};

export default function MerchantProductEditPage({
  product,
  onBack,
  onSave,
}: MerchantProductEditPageProps) {
  const [form] = Form.useForm();
  const { t } = useTranslation("common");

  const handleFinish = (values: { name: string; description?: string; price: string }) => {
    onSave?.(values);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f8] pb-20">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
        <div className="relative flex items-center justify-center p-4">
          <button
            type="button"
            onClick={onBack}
            aria-label="返回"
            className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-700"
          >
            <LeftOutlined />
          </button>
          <Title level={4} className="!mb-0">
            {t("merchantEdit.title")}
          </Title>
        </div>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-20">
        <div className="px-4 mt-4 space-y-4">
        {/* 基本信息卡片 */}
        <div className="bg-white rounded-3xl shadow-sm p-4">
          <Title level={5} className="!mb-3">
            {t("merchantEdit.basicInfo")}
          </Title>
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              name: product?.name ?? "",
              description: "",
              price: product?.price ?? "",
            }}
            onFinish={handleFinish}
          >
            <Form.Item
              label={
                <span className="text-sm text-slate-900">
                  {t("merchantEdit.name")}
                </span>
              }
              name="name"
              rules={[{ required: true, message: t("merchantEdit.namePlaceholder") }]}
            >
              <Input
                placeholder={t("merchantEdit.namePlaceholder")}
                className="!border-0 !border-b !rounded-none !px-0 !pb-3"
              />
            </Form.Item>

            <div className="h-px bg-slate-100 -mx-4 my-1" />

            <Form.Item
              label={
                <span className="text-sm text-slate-900">
                  {t("merchantEdit.description")}
                </span>
              }
              name="description"
            >
              <Input.TextArea
                autoSize={{ minRows: 2, maxRows: 4 }}
                placeholder={t("merchantEdit.descriptionPlaceholder")}
                className="!border-0 !px-0 !pt-1"
              />
            </Form.Item>

            <div className="h-px bg-slate-100 -mx-4 my-1" />

            <div className="space-y-2">
              <Text className="text-sm text-slate-900">
                {t("merchantEdit.images")}
              </Text>
              <div className="flex gap-3">
                {/* 已有图片 */}
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-slate-100">
                  <img
                    src={productImg}
                    alt={t("merchantEdit.images")}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px]"
                    aria-label="删除图片"
                  >
                    <CloseCircleFilled className="!text-[10px]" />
                  </button>
                </div>

                {/* 占位上传框 */}
                <div className="w-20 h-20 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400">
                  <PlusOutlined />
                </div>
                <div className="w-20 h-20 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400">
                  <PlusOutlined />
                </div>
              </div>
            </div>
          </Form>
        </div>

        {/* 价格信息卡片 */}
        <div className="bg-white rounded-3xl shadow-sm p-4">
          <Title level={5} className="!mb-3">
            {t("merchantEdit.priceInfo")}
          </Title>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-900">
              {t("merchantEdit.price")}
            </span>
            <div className="flex items-center gap-2">
              <Form.Item
                name="price"
                noStyle
                rules={[
                  { required: true, message: t("merchantEdit.priceRequired") },
                ]}
              >
                <Input
                  type="number"
                  placeholder={t("merchantEdit.pricePlaceholder")}
                  className="!w-28 text-right"
                />
              </Form.Item>
              <span className="text-sm text-slate-500">
                {t("merchantEdit.priceUnit")}
              </span>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* 底部保存按钮 */}
      <div className="fixed left-0 right-0 bottom-0 px-4 pb-6 pt-4 bg-[#f5f5f8]">
        <Button
          type="primary"
          block
          shape="round"
          className="!bg-slate-900 !border-slate-900 h-12"
          onClick={() => form.submit()}
        >
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}


