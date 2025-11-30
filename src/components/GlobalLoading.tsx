import { LoadingOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

type GlobalLoadingProps = {
  visible: boolean;
  message?: string;
};

export default function GlobalLoading({ visible, message }: GlobalLoadingProps) {
  const { t } = useTranslation("common");

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/5 backdrop-blur-sm transition-opacity duration-200"
      role="alert"
      aria-live="assertive"
      aria-busy="true"
    >
      <div className="bg-white rounded-[28px] px-8 py-6 shadow-xl flex flex-col items-center gap-3 min-w-[220px]">
        <LoadingOutlined className="text-3xl text-slate-900 animate-spin" />
        <div className="text-sm font-medium text-slate-900">
          {message ?? t("globalLoading.defaultMessage")}
        </div>
        <div className="text-xs text-slate-400">
          {t("globalLoading.pleaseWait")}
        </div>
      </div>
    </div>
  );
}

