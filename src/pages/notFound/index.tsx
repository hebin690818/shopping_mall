import { Button, Result } from "antd";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/routes";

const NotFoundPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Result
      status="404"
      title={t("notFound.title")}
      subTitle={t("notFound.subtitle")}
      extra={
        <Button type="primary" onClick={() => navigate(ROUTES.HOME)}>
          {t("notFound.backHome")}
        </Button>
      }
    />
  );
};

export default NotFoundPage;


