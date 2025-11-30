import { Button, Typography } from "antd";
import { LeftOutlined, CheckCircleTwoTone, CloseCircleTwoTone } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

const { Title } = Typography;

type Status = "success" | "fail";

type MerchantApplyResultPageProps = {
  status: Status;
  onBack?: () => void;
  onPrimary?: () => void;
};

export default function MerchantApplyResultPage({
  status,
  onBack,
  onPrimary,
}: MerchantApplyResultPageProps) {
  const isSuccess = status === "success";
  const { t } = useTranslation("common");

  return (
    <div className="min-h-screen bg-[#f5f5f8] pb-16">
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
            {t("merchantApplyResult.title")}
          </Title>
        </div>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-20">
        {/* 结果卡片 */}
        <div className="px-4 mt-6">
        <div className="bg-white rounded-3xl shadow-sm px-4 py-10 flex items-center justify-center">
          <div className="flex items-center gap-3">
            {isSuccess ? (
              <CheckCircleTwoTone twoToneColor="#22c55e" className="!text-2xl" />
            ) : (
              <CloseCircleTwoTone twoToneColor="#f97373" className="!text-2xl" />
            )}
            <span className="text-lg font-semibold text-slate-900">
              {isSuccess
                ? t("merchantApplyResult.success")
                : t("merchantApplyResult.fail")}
            </span>
          </div>
        </div>
        </div>
      </div>

      {/* 底部按钮区域 */}
      <div className="fixed left-0 right-0 bottom-0 px-4 pb-8 pt-6 bg-[#f5f5f8] flex gap-4">
        <Button
          block
          shape="round"
          className="h-12 !border-slate-300 !text-slate-900 bg-white"
          onClick={onBack}
        >
          {t("merchantApplyResult.back")}
        </Button>
        <Button
          type="primary"
          block
          shape="round"
          className="h-12 !bg-slate-900 !border-slate-900"
          onClick={onPrimary}
        >
          {isSuccess
            ? t("merchantApplyResult.uploadProduct")
            : t("merchantApplyResult.retry")}
        </Button>
      </div>
    </div>
  );
}


