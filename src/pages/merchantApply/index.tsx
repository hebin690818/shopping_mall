import { Button, Form, Input, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../routes";
import backSvg from "@/assets/back.svg";

const { Title, Text } = Typography;

export default function MerchantApplyPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { t } = useTranslation("common");

  const handleFinish = (values: { name: string; description?: string }) => {
    // 这里可以添加实际的提交逻辑
    console.log("提交商家申请:", values);
    navigate(ROUTES.MERCHANT_APPLY_RESULT.replace(':status', 'success'));
  };

  return (
    <div className="min-h-screen bg-[#f5f5f8] pb-12">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
        <div className="relative flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="返回"
            className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center z-10"
          >
            <img src={backSvg} alt="返回" className="w-5 h-5" />
          </button>
          <Title level={4} className="!mb-0">
            {t("merchantApply.title")}
          </Title>
        </div>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-20">
        {/* 表单卡片 */}
        <div className="px-4">
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <Form
            layout="vertical"
            form={form}
            onFinish={handleFinish}
            requiredMark="optional"
          >
            <Form.Item
              label={
                <span className="text-sm text-slate-900">
                  {t("merchantApply.nameLabel")}{" "}
                  <span className="text-red-500">*</span>
                </span>
              }
              name="name"
              rules={[{ required: true, message: t("merchantApply.nameRequired") }]}
            >
              <Input
                size="large"
                placeholder={t("merchantApply.namePlaceholder")}
                className="!border-0 !border-b !rounded-none !px-0 !pb-3"
              />
            </Form.Item>

            <div className="h-px bg-slate-100" />

            <Form.Item
              label={
                <span className="text-sm text-slate-900">
                  {t("merchantApply.descLabel")}
                </span>
              }
              name="description"
            >
              <Input.TextArea
                autoSize={{ minRows: 2, maxRows: 4 }}
                placeholder={t("merchantApply.descPlaceholder")}
                className="!border-0 !px-0 !pt-1"
              />
            </Form.Item>
          </Form>
        </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="fixed left-0 right-0 bottom-0 px-4 pb-6 pt-4 bg-[#f5f5f8]">
        <Button
          type="primary"
          block
          shape="round"
          className="!bg-slate-900 !border-slate-900 h-12"
          onClick={() => form.submit()}
        >
          {t("merchantApply.submit")}
        </Button>
        <Text className="mt-2 block text-center text-xs text-slate-400">
          {t("merchantApply.tip")}
        </Text>
      </div>
    </div>
  );
}


