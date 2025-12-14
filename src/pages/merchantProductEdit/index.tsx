import { useEffect, useState } from "react";
import {
  Button,
  Form,
  Input,
  Typography,
  Select,
  message,
  Upload,
  Spin,
} from "antd";
import { PlusOutlined, CloseCircleFilled } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "../../routes";
import { api, type Category, type Product } from "../../lib/api";
import backSvg from "@/assets/back.svg";
import type { UploadFile } from "antd/es/upload/interface";
import { API_BASE_URL } from "@/lib/config";

const { Title, Text } = Typography;

export default function MerchantProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { t } = useTranslation("common");
  const [categories, setCategories] = useState<Category[]>([]);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [selectOpen, setSelectOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);

  // 判断是新增还是编辑模式
  const isEditMode = id && id !== "new";

  // 获取分类列表
  useEffect(() => {
    let isMounted = true; // 组件挂载标志

    const fetchCategories = async () => {
      try {
        const data = await api.getCategories();
        // 只在组件仍挂载时更新状态
        if (isMounted) {
          setCategories(data);
        }
      } catch (error) {
        console.error("获取分类列表失败:", error);
        if (isMounted) {
          message.error(t("merchantEdit.categoryLoadFailed"));
        }
      }
    };
    fetchCategories();

    // 清理函数
    return () => {
      isMounted = false;
    };
  }, [t]);

  // 编辑模式：从API获取商品详情
  useEffect(() => {
    if (!isEditMode || !id) {
      // 新增模式：重置表单为空
      form.resetFields();
      setImageUrl("");
      setFileList([]);
      setProduct(null);
      return;
    }

    let isMounted = true;

    const fetchProduct = async () => {
      try {
        setLoading(true);
        const productData = await api.getProductById(id);

        if (!isMounted) return;

        if (!productData) {
          message.error(t("merchantEdit.productNotFound"));
          navigate(ROUTES.MERCHANT_CENTER);
          return;
        }

        setProduct(productData);

        // 设置表单初始值
        const productImageUrl =
          productData.image_url || productData.image || "";
        form.setFieldsValue({
          name: productData.name,
          description: productData.description || "",
          price:
            typeof productData.price === "string"
              ? parseFloat(productData.price) || 0
              : productData.price || 0,
          category_id: productData.category_id,
        });

        // 设置图片
        if (productImageUrl) {
          setImageUrl(productImageUrl);
          setFileList([
            {
              uid: "-1",
              name: "product-image",
              status: "done",
              url: productImageUrl.startsWith("http")
                ? productImageUrl
                : `${API_BASE_URL}${productImageUrl}`,
            },
          ]);
        }
      } catch (error: any) {
        console.error("获取商品详情失败:", error);
        if (isMounted) {
          message.error(error.message || t("merchantEdit.productLoadFailed"));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProduct();

    return () => {
      isMounted = false;
    };
  }, [isEditMode, id, form, navigate, t]);

  // 处理图片上传
  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await api.uploadImage(file);
      setImageUrl(result.url);
      setFileList([
        {
          uid: "-1",
          name: result.filename,
          status: "done",
          url: result.url,
        },
      ]);
      message.success(t("merchantEdit.imageUploadSuccess"));
      return false; // 阻止默认上传行为
    } catch (error: any) {
      message.error(error.message || t("merchantEdit.imageUploadFailed"));
      return false;
    } finally {
      setUploading(false);
    }
  };

  // 处理图片删除
  const handleImageRemove = () => {
    setImageUrl("");
    setFileList([]);
  };

  const handleFinish = async (values: {
    name: string;
    description?: string;
    price: string | number;
    category_id?: number;
  }) => {
    // 验证必填项
    if (!values.category_id) {
      message.error(t("merchantEdit.categoryRequired"));
      return;
    }

    if (!imageUrl) {
      message.error(t("merchantEdit.imageRequired"));
      return;
    }

    // 验证价格参数
    if (
      values.price === undefined ||
      values.price === null ||
      values.price === ""
    ) {
      message.error(t("merchantEdit.priceRequired"));
      return;
    }

    try {
      setUploading(true);

      if (isEditMode && id) {
        // 编辑模式：更新商品
        let productId: number;
        if (product?.id) {
          productId =
            typeof product.id === "string"
              ? parseInt(product.id, 10)
              : (product.id as number);
        } else {
          productId = parseInt(id, 10);
        }

        // 保持商品原有状态，如果原来没有状态则默认为 published（上架）
        const currentStatus = (product as any)?.status;
        const statusToUpdate = currentStatus || "published";
        
        await api.updateProduct({
          id: productId,
          category_id: values.category_id,
          description: values.description || "",
          image_url: imageUrl,
          name: values.name,
          price: Number(values.price),
          status: statusToUpdate,
        });
      } else {
        // 新增模式：创建商品
        await api.createProduct({
          category_id: values.category_id,
          description: values.description || "",
          image_url: imageUrl,
          name: values.name,
          price: Number(values.price),
        });
      }

      // 导航到商家中心并传递刷新标志
      navigate(ROUTES.MERCHANT_CENTER, {
        state: { refreshProducts: true },
      });
    } catch (error: any) {
      message.error(
        error.message ||
          (isEditMode
            ? t("merchantEdit.productUpdateFailed")
            : t("merchantEdit.productCreateFailed"))
      );
    } finally {
      setUploading(false);
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
            {isEditMode ? t("merchantEdit.title") : t("merchantEdit.addTitle")}
          </Title>
        </div>
      </div>

      {/* Content with padding-top to avoid header overlap */}
      <div className="pt-20">
        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Spin size="large" />
          </div>
        ) : (
          <div className="px-4 space-y-4">
            {/* 基本信息卡片 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <Title level={5} className="!mb-3">
                {t("merchantEdit.basicInfo")}
              </Title>
              <Form form={form} layout="vertical" onFinish={handleFinish}>
                <Form.Item
                  label={
                    <span className="text-sm text-slate-900">
                      {t("merchantEdit.name")}
                    </span>
                  }
                  name="name"
                  rules={[
                    {
                      required: true,
                      message: t("merchantEdit.namePlaceholder"),
                    },
                  ]}
                >
                  <Input
                    placeholder={t("merchantEdit.namePlaceholder")}
                    className="!border-0 !border-b !rounded-none !px-0 !pb-3"
                  />
                </Form.Item>

                <Form.Item
                  label={
                    <span className="text-sm text-slate-900">
                      {t("merchantEdit.category")}
                    </span>
                  }
                  name="category_id"
                  rules={[
                    { required: true, message: t("merchantEdit.categoryRequired") },
                  ]}
                >
                  <Select
                    placeholder={t("merchantEdit.categoryPlaceholder")}
                    className="!border-0 !border-b !rounded-none !px-0"
                    style={{ borderBottom: "1px solid #e2e8f0" }}
                    open={selectOpen}
                    onDropdownVisibleChange={setSelectOpen}
                    onSelect={() => setSelectOpen(false)}
                    options={categories.map((cat) => ({
                      label: cat.name,
                      value: parseInt(cat.id) || 0,
                    }))}
                  />
                </Form.Item>

                <Form.Item
                  label={
                    <span className="text-sm text-slate-900">
                      {t("merchantEdit.description")}
                    </span>
                  }
                  name="description"
                >
                  <Input.TextArea
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    placeholder={t("merchantEdit.descriptionPlaceholder")}
                    className="!border-0 !px-0 !pt-1 !border-b !rounded-none"
                  />
                </Form.Item>

                <div className="space-y-2">
                  <Text className="text-sm text-slate-900">
                    {t("merchantEdit.images")}
                  </Text>
                  <div className="flex gap-3 flex-wrap">
                    {/* 显示已上传的图片 */}
                    {imageUrl ? (
                      <div className="relative group">
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
                          <img
                            src={
                              imageUrl.startsWith("http")
                                ? imageUrl
                                : `${API_BASE_URL}${imageUrl}`
                            }
                            alt={t("merchantEdit.images")}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleImageRemove}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors duration-200 z-10"
                          aria-label={t("ariaLabels.deleteImage")}
                        >
                          <CloseCircleFilled className="text-xs" />
                        </button>
                        {/* 悬停遮罩 */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-xl pointer-events-none" />
                      </div>
                    ) : (
                      <Upload
                        beforeUpload={(file) => {
                          handleImageUpload(file);
                          return false; // 阻止默认上传
                        }}
                        fileList={fileList}
                        listType="picture-card"
                        maxCount={1}
                        accept="image/*"
                        showUploadList={false}
                        className="upload-wrapper"
                      >
                        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-500 transition-all duration-200 cursor-pointer group">
                          {uploading ? (
                            <>
                              <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mb-2" />
                              <span className="text-xs text-slate-500">
                                {t("merchantEdit.uploading")}
                              </span>
                            </>
                          ) : (
                            <>
                              <div className="w-10 h-10 rounded-full bg-slate-200 group-hover:bg-slate-300 flex items-center justify-center transition-colors duration-200">
                                <PlusOutlined className="text-lg text-slate-500 group-hover:text-slate-600" />
                              </div>
                            </>
                          )}
                        </div>
                      </Upload>
                    )}
                  </div>
                </div>

                {/* 价格信息 */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-900">
                      {t("merchantEdit.price")}($)
                    </span>
                    <div className="flex items-center gap-2">
                      <Form.Item
                        name="price"
                        noStyle
                        rules={[
                          {
                            required: true,
                            message: t("merchantEdit.priceRequired"),
                          },
                        ]}
                      >
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          placeholder={t("merchantEdit.pricePlaceholder")}
                          className="!w-28 text-right"
                        />
                      </Form.Item>
                    </div>
                  </div>
                </div>
              </Form>
            </div>
          </div>
        )}
      </div>

      {/* 底部保存按钮 */}
      <div className="fixed left-0 right-0 bottom-0 px-4 pb-6 pt-4 bg-[#f5f5f8]">
        <Button
          type="primary"
          block
          shape="round"
          className="!bg-slate-900 !border-slate-900 h-12"
          onClick={() => form.submit()}
          loading={uploading}
        >
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
