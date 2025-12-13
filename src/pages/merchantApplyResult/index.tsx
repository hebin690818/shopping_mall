import { Button, Typography } from "antd";
import { CheckCircleTwoTone, CloseCircleTwoTone } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "../../routes";
import backSvg from "@/assets/back.svg";

const { Title } = Typography;

export default function MerchantApplyResultPage() {
  const { status } = useParams<{ status: string }>();
  const navigate = useNavigate();
  const isSuccess = status === "success";
  const { t } = useTranslation("common");

  return (
    <div className="min-h-screen bg-[#f5f5f8] pb-16">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
        <div className="relative flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => navigate(ROUTES.MERCHANT)}
            aria-label={t("ariaLabels.back")}
            className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center z-10"
          >
            <img src={backSvg} alt={t("ariaLabels.back")} className="w-5 h-5" />
          </button>
          <Title level={5} className="!mb-0">
            {t("merchantApplyResult.title")}
          </Title>
        </div>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-20">
        {/* 结果卡片 */}
        <div className="px-4">
        <div className="bg-white rounded-lg shadow-sm px-4 py-10 flex items-center justify-center">
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
          onClick={() => navigate(ROUTES.MERCHANT)}
        >
          {t("merchantApplyResult.back")}
        </Button>
        <Button
          type="primary"
          block
          shape="round"
          className="h-12 !bg-slate-900 !border-slate-900"
          onClick={() => {
            if (isSuccess) {
              navigate(ROUTES.HOME);
            } else {
              navigate(ROUTES.MERCHANT_APPLY);
            }
          }}
        >
          {isSuccess
            ? t("merchantApplyResult.uploadProduct")
            : t("merchantApplyResult.retry")}
        </Button>
      </div>
    </div>
  );
}


