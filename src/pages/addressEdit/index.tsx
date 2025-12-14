import { Button, Card, Typography, Form, Input, message } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import backSvg from "@/assets/back.svg";
import { api } from "../../lib/api";
import { useGlobalLoading } from "../../contexts/LoadingProvider";

const { Title, Text } = Typography;

export default function AddressEditPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();
  const { showLoading, hideLoading } = useGlobalLoading();
  const [isLoading, setIsLoading] = useState(false);
  const [addressId, setAddressId] = useState<number | null>(null);
  const isEditMode = addressId !== null;

  // 从URL参数获取地址ID
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      const parsedId = parseInt(id, 10);
      if (!isNaN(parsedId)) {
        setAddressId(parsedId);
      }
    }
  }, [searchParams]);

  // 如果是编辑模式，加载地址数据
  useEffect(() => {
    if (!isEditMode || !addressId) return;

    let isMounted = true;

    const loadAddress = async () => {
      setIsLoading(true);
      try {
        const addresses = await api.getUserAddresses({ force: true });
        const address = addresses.find((addr) => addr.id === addressId);
        if (isMounted && address) {
          form.setFieldsValue({
            address: address.address,
            phone: address.phone,
            recipient_name: address.recipient_name,
          });
        } else if (isMounted) {
          message.error(t("messages.loadFailed"));
          navigate(-1);
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          return;
        }
        console.error("加载地址失败:", error);
        if (isMounted) {
          message.error(t("messages.loadFailed"));
          navigate(-1);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAddress();

    return () => {
      isMounted = false;
    };
  }, [isEditMode, addressId, form, navigate, t]);

  // 处理表单提交
  const handleSubmit = async (values: {
    address: string;
    phone: string;
    recipient_name: string;
  }) => {
    showLoading(
      isEditMode
        ? t("loading.updating")
        : t("loading.creating")
    );

    try {
      if (isEditMode && addressId) {
        await api.updateAddress(addressId, values);
      } else {
        await api.createAddress(values);
      }
      navigate(-1);
    } catch (error: any) {
      console.error("保存地址失败:", error);
      message.error(
        error?.message ||
          (isEditMode
            ? t("messages.updateFailed")
            : t("messages.createFailed"))
      );
    } finally {
      hideLoading();
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f8] pb-20">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
        <div className="relative flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={t("ariaLabels.back")}
            className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center z-10"
          >
            <img src={backSvg} alt={t("ariaLabels.back")} className="w-5 h-5" />
          </button>
          <Title level={5} className="!mb-0">
            {isEditMode
              ? t("addressEdit.editTitle") || t("addressEdit.title")
              : t("addressEdit.addTitle") || t("addressEdit.title")}
          </Title>
        </div>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-20">
        <div className="px-4">
          <Card className="!rounded-lg shadow-sm">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{
                address: "",
                phone: "",
                recipient_name: "",
              }}
            >
              {/* 收件人 */}
              <Form.Item
                name="recipient_name"
                label={
                  <Text className="text-sm font-medium text-slate-900">
                    {t("addressEdit.receiver")}
                  </Text>
                }
                rules={[
                  {
                    required: true,
                    message: t("addressEdit.receiverRequired"),
                  },
                ]}
              >
                <Input
                  placeholder={t("addressEdit.receiverPlaceholder")}
                  className="!border-0 !border-b !rounded-none !px-0 !pb-3"
                  disabled={isLoading}
                />
              </Form.Item>

              {/* 联系电话 */}
              <Form.Item
                name="phone"
                label={
                  <Text className="text-sm font-medium text-slate-900">
                    {t("addressEdit.phone")}
                  </Text>
                }
                rules={[
                  {
                    required: true,
                    message: t("addressEdit.phoneRequired"),
                  },
                  {
                    pattern: /^[\d\s\-+()]+$/,
                    message: t("addressEdit.phoneInvalid"),
                  },
                ]}
              >
                <Input
                  placeholder={t("addressEdit.phonePlaceholder")}
                  className="!border-0 !border-b !rounded-none !px-0 !pb-3"
                  disabled={isLoading}
                />
              </Form.Item>

              {/* 地址 */}
              <Form.Item
                name="address"
                label={
                  <Text className="text-sm font-medium text-slate-900">
                    {t("addressEdit.address")}
                  </Text>
                }
                rules={[
                  {
                    required: true,
                    message: t("addressEdit.addressRequired"),
                  },
                ]}
              >
                <Input.TextArea
                  placeholder={t("addressEdit.addressPlaceholder")}
                  autoSize={{ minRows: 3, maxRows: 6 }}
                  className="min-h-[96px] rounded-2xl bg-slate-50 border border-slate-100 px-3 py-2"
                  disabled={isLoading}
                />
              </Form.Item>
            </Form>
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
          onClick={() => form.submit()}
          loading={isLoading}
        >
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
