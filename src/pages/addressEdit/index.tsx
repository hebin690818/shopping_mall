import { Button, Card, Typography } from "antd";
import { LeftOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

const { Title, Text } = Typography;

type AddressEditPageProps = {
  onBack?: () => void;
};

export default function AddressEditPage({ onBack }: AddressEditPageProps) {
  const { t } = useTranslation("common");

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
            {t("addressEdit.title")}
          </Title>
        </div>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-20">
        <div className="px-4 mt-4">
          <Card className="!rounded-3xl shadow-sm !p-0 overflow-hidden">
            <div className="px-4 py-4 space-y-0.5">
              {/* 地址 */}
              <div className="flex items-start justify-between py-2">
                <Text className="text-sm font-medium text-slate-900">
                  {t("addressEdit.address")}
                </Text>
                <Text className="w-56 text-right text-xs text-slate-500 leading-relaxed">
                  {t("addressEdit.addressPlaceholder")}
                </Text>
              </div>
              <div className="h-px bg-slate-100 -mx-4" />

              {/* 收件人 */}
              <div className="flex items-center justify-between py-2">
                <Text className="text-sm font-medium text-slate-900">
                  {t("addressEdit.receiver")}
                </Text>
                <Text className="text-sm text-slate-500">
                  {t("addressEdit.receiverPlaceholder")}
                </Text>
              </div>
              <div className="h-px bg-slate-100 -mx-4" />

              {/* 联系电话 */}
              <div className="flex items-center justify-between py-2">
                <Text className="text-sm font-medium text-slate-900">
                  {t("addressEdit.phone")}
                </Text>
                <Text className="text-sm text-slate-500">
                  {t("addressEdit.phonePlaceholder")}
                </Text>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 底部保存按钮 */}
      <div className="fixed left-0 right-0 bottom-0 px-4 pb-6 pt-4 bg-[#f5f5f8]">
        <Button
          type="primary"
          block
          shape="round"
          className="!bg-slate-900 !border-slate-900 h-12"
        >
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
