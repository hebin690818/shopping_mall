import { useEffect, useState, useRef } from "react";
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
import { PlusOutlined, CloseCircleFilled, DeleteOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "@/routes";
import { api, type Category, type Product } from "@/lib/api";
import backSvg from "@/assets/back.svg";
import type { UploadFile } from "antd/es/upload/interface";
import { API_BASE_URL_IMAGE } from "@/lib/config";

const { Title, Text } = Typography;

// 规格类型定义
interface Specification {
  spec_name: string;
  options: string[];
  sort_order: number;
}

export default function MerchantProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { t } = useTranslation("common");
  const [categories, setCategories] = useState<Category[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [detailImagesUrls, setDetailImagesUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingDetailImages, setUploadingDetailImages] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [detailImagesFileList, setDetailImagesFileList] = useState<UploadFile[]>([]);
  const [selectOpen, setSelectOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const pendingFilesRef = useRef<File[]>([]);
  const pendingDetailFilesRef = useRef<File[]>([]);
  const [specifications, setSpecifications] = useState<Specification[]>([]);

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
      setImageUrls([]);
      setDetailImagesUrls([]);
      setFileList([]);
      setDetailImagesFileList([]);
      setProduct(null);
      setSpecifications([]);
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

        // 设置图片（支持逗号分隔的多张图片）
        if (productImageUrl) {
          const urls = productImageUrl
            .split(",")
            .filter((url: string) => url.trim());
          setImageUrls(urls);
          setFileList(
            urls.map((url: string, index: number) => ({
              uid: `-${index + 1}`,
              name: `product-image-${index + 1}`,
              status: "done" as const,
              url: url.startsWith("http") ? url : `${API_BASE_URL_IMAGE}${url}`,
            }))
          );
        } else {
          setImageUrls([]);
          setFileList([]);
        }

        // 设置详情图片（支持数组或逗号分隔的字符串）
        const detailImagesData = (productData as any).detail_images;
        let detailUrls: string[] = [];
        if (detailImagesData) {
          if (Array.isArray(detailImagesData)) {
            // 如果是数组，直接使用
            detailUrls = detailImagesData.filter((url: any) => url && String(url).trim());
          } else if (typeof detailImagesData === "string") {
            // 如果是字符串，尝试解析为数组或按逗号分割
            try {
              const parsed = JSON.parse(detailImagesData);
              if (Array.isArray(parsed)) {
                detailUrls = parsed.filter((url: any) => url && String(url).trim());
              } else {
                detailUrls = detailImagesData
                  .split(",")
                  .filter((url: string) => url.trim());
              }
            } catch {
              // 解析失败，按逗号分割
              detailUrls = detailImagesData
                .split(",")
                .filter((url: string) => url.trim());
            }
          }
        }
        setDetailImagesUrls(detailUrls);
        setDetailImagesFileList(
          detailUrls.map((url: string, index: number) => ({
            uid: `detail-${index + 1}`,
            name: `detail-image-${index + 1}`,
            status: "done" as const,
            url: url.startsWith("http") ? url : `${API_BASE_URL_IMAGE}${url}`,
          }))
        );

        // 设置规格数据
        let specsData: Specification[] = [];
        const rawSpecs = (productData as any).specifications;
        
        if (rawSpecs) {
          try {
            // 如果规格数据是字符串，尝试解析JSON
            if (typeof rawSpecs === "string") {
              const parsed = JSON.parse(rawSpecs);
              specsData = Array.isArray(parsed) ? parsed : [];
            } else if (Array.isArray(rawSpecs)) {
              specsData = rawSpecs;
            }
            
            // 验证和规范化规格数据格式
            specsData = specsData
              .filter((spec: any) => spec && (spec.spec_name || spec.name))
              .map((spec: any, index: number) => ({
                spec_name: spec.spec_name || spec.name || "",
                options: Array.isArray(spec.options) 
                  ? spec.options
                      .map((opt: any) => String(opt || "").trim())
                      .filter((opt: string) => opt !== "")
                  : [],
                sort_order: spec.sort_order !== undefined ? spec.sort_order : index,
              }))
              .filter((spec) => spec.spec_name.trim() !== "" && spec.options.length > 0);
          } catch (error) {
            console.error("解析规格数据失败:", error);
            specsData = [];
          }
        }
        
        setSpecifications(specsData);
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

  // 处理批量图片上传
  const handleBatchImageUpload = async (files: File[]) => {
    // 检查总数量是否超过限制
    const remainingSlots = 9 - imageUrls.length;
    if (remainingSlots <= 0) {
      message.error(t("merchantEdit.maxImagesLimit"));
      return;
    }

    // 只处理剩余可上传的数量
    const filesToUpload = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      message.warning(`最多只能上传${remainingSlots}张图片`);
    }

    setUploadingImages(true);
    try {
      const uploadPromises = filesToUpload.map((file) => api.uploadImage(file));
      const results = await Promise.all(uploadPromises);
      
      const newUrls = results.map((result) => result.url);
      const updatedUrls = [...imageUrls, ...newUrls];
      setImageUrls(updatedUrls);

      setFileList(
        updatedUrls.map((url, index) => ({
          uid: `-${index + 1}`,
          name: `product-image-${index + 1}`,
          status: "done" as const,
          url: url.startsWith("http") ? url : `${API_BASE_URL_IMAGE}${url}`,
        }))
      );
      
      const successMessage = filesToUpload.length > 1 
        ? `${t("merchantEdit.imageUploadSuccess")} (${filesToUpload.length}张)`
        : t("merchantEdit.imageUploadSuccess");
      message.success(successMessage);
    } catch (error: any) {
      message.error(error.message || t("merchantEdit.imageUploadFailed"));
    } finally {
      setUploadingImages(false);
    }
  };

  // 处理图片删除
  const handleImageRemove = (index: number) => {
    const updatedUrls = imageUrls.filter((_, i) => i !== index);
    setImageUrls(updatedUrls);
    setFileList(
      updatedUrls.map((url, i) => ({
        uid: `-${i + 1}`,
        name: `product-image-${i + 1}`,
        status: "done" as const,
        url: url.startsWith("http") ? url : `${API_BASE_URL_IMAGE}${url}`,
      }))
    );
  };

  // 处理批量详情图片上传
  const handleBatchDetailImageUpload = async (files: File[]) => {
    // 检查总数量是否超过限制
    const remainingSlots = 9 - detailImagesUrls.length;
    if (remainingSlots <= 0) {
      message.error(t("merchantEdit.maxImagesLimit"));
      return;
    }

    // 只处理剩余可上传的数量
    const filesToUpload = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      message.warning(`最多只能上传${remainingSlots}张详情图片`);
    }

    setUploadingDetailImages(true);
    try {
      const uploadPromises = filesToUpload.map((file) => api.uploadImage(file));
      const results = await Promise.all(uploadPromises);
      
      const newUrls = results.map((result) => result.url);
      const updatedUrls = [...detailImagesUrls, ...newUrls];
      setDetailImagesUrls(updatedUrls);

      setDetailImagesFileList(
        updatedUrls.map((url, index) => ({
          uid: `detail-${index + 1}`,
          name: `detail-image-${index + 1}`,
          status: "done" as const,
          url: url.startsWith("http") ? url : `${API_BASE_URL_IMAGE}${url}`,
        }))
      );
      
      const successMessage = filesToUpload.length > 1 
        ? `${t("merchantEdit.imageUploadSuccess")} (${filesToUpload.length}张)`
        : t("merchantEdit.imageUploadSuccess");
      message.success(successMessage);
    } catch (error: any) {
      message.error(error.message || t("merchantEdit.imageUploadFailed"));
    } finally {
      setUploadingDetailImages(false);
    }
  };

  // 处理详情图片删除
  const handleDetailImageRemove = (index: number) => {
    const updatedUrls = detailImagesUrls.filter((_, i) => i !== index);
    setDetailImagesUrls(updatedUrls);
    setDetailImagesFileList(
      updatedUrls.map((url, i) => ({
        uid: `detail-${i + 1}`,
        name: `detail-image-${i + 1}`,
        status: "done" as const,
        url: url.startsWith("http") ? url : `${API_BASE_URL_IMAGE}${url}`,
      }))
    );
  };

  // 添加规格
  const handleAddSpecification = () => {
    setSpecifications([
      ...specifications,
      {
        spec_name: "",
        options: [""],
        sort_order: specifications.length,
      },
    ]);
  };

  // 删除规格
  const handleRemoveSpecification = (index: number) => {
    const updated = specifications
      .filter((_, i) => i !== index)
      .map((spec, i) => ({ ...spec, sort_order: i }));
    setSpecifications(updated);
  };

  // 更新规格名称
  const handleSpecNameChange = (index: number, value: string) => {
    const updated = [...specifications];
    updated[index] = { ...updated[index], spec_name: value };
    setSpecifications(updated);
  };

  // 添加规格选项
  const handleAddOption = (specIndex: number) => {
    const updated = [...specifications];
    updated[specIndex] = {
      ...updated[specIndex],
      options: [...updated[specIndex].options, ""],
    };
    setSpecifications(updated);
  };

  // 删除规格选项
  const handleRemoveOption = (specIndex: number, optionIndex: number) => {
    const updated = [...specifications];
    updated[specIndex] = {
      ...updated[specIndex],
      options: updated[specIndex].options.filter((_, i) => i !== optionIndex),
    };
    setSpecifications(updated);
  };

  // 更新规格选项
  const handleOptionChange = (
    specIndex: number,
    optionIndex: number,
    value: string
  ) => {
    const updated = [...specifications];
    updated[specIndex] = {
      ...updated[specIndex],
      options: updated[specIndex].options.map((opt, i) =>
        i === optionIndex ? value : opt
      ),
    };
    setSpecifications(updated);
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

    if (imageUrls.length === 0) {
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
      setSubmitting(true);

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

        // 将图片URL数组用逗号连接
        const imageUrlString = imageUrls.join(",");
        // 详情图片作为数组传递
        // 过滤掉空的规格和选项
        const validSpecs = specifications
          .map((spec) => ({
            ...spec,
            options: spec.options.filter((opt) => opt.trim() !== ""),
          }))
          .filter(
            (spec) =>
              spec.spec_name.trim() !== "" && spec.options.length > 0
          )
          .map((spec, index) => ({ ...spec, sort_order: index }));

        await api.updateProduct({
          id: productId,
          category_id: values.category_id,
          description: values.description || "",
          image_url: imageUrlString,
          detail_images: detailImagesUrls.length > 0 ? detailImagesUrls : undefined,
          name: values.name,
          price: Number(values.price),
          status: statusToUpdate,
          specifications: validSpecs.length > 0 ? validSpecs : undefined,
        } as any);
      } else {
        // 新增模式：创建商品
        // 将图片URL数组拼接API_BASE_URL_IMAGE后用逗号连接
        const imageUrlString = imageUrls
          .map((url) => {
            // 如果已经是完整URL，直接返回；否则拼接API_BASE_URL_IMAGE
            return url.startsWith("http") ? url : `${API_BASE_URL_IMAGE}${url}`;
          })
          .join(",");
        // 详情图片作为数组传递，处理URL前缀
        const processedDetailImages = detailImagesUrls
          .map((url) => {
            // 如果已经是完整URL，直接返回；否则拼接API_BASE_URL_IMAGE
            return url.startsWith("http") ? url : `${API_BASE_URL_IMAGE}${url}`;
          });
        // 过滤掉空的规格和选项
        const validSpecs = specifications
          .map((spec) => ({
            ...spec,
            options: spec.options.filter((opt) => opt.trim() !== ""),
          }))
          .filter(
            (spec) =>
              spec.spec_name.trim() !== "" && spec.options.length > 0
          )
          .map((spec, index) => ({ ...spec, sort_order: index }));

        await api.createProduct({
          category_id: values.category_id,
          description: values.description || "",
          image_url: imageUrlString,
          detail_images: processedDetailImages.length > 0 ? processedDetailImages : undefined,
          name: values.name,
          price: Number(values.price),
          specifications: validSpecs.length > 0 ? validSpecs : undefined,
        } as any);
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
      setSubmitting(false);
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
                    {
                      required: true,
                      message: t("merchantEdit.categoryRequired"),
                    },
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
                    {t("merchantEdit.images")} ({imageUrls.length}/9)
                  </Text>
                  <div className="flex gap-3 flex-wrap">
                    {/* 显示已上传的图片 */}
                    {imageUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
                          <img
                            src={
                              url.startsWith("http")
                                ? url
                                : `${API_BASE_URL_IMAGE}${url}`
                            }
                            alt={`${t("merchantEdit.images")} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleImageRemove(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors duration-200 z-10"
                          aria-label={t("ariaLabels.deleteImage")}
                        >
                          <CloseCircleFilled className="text-xs" />
                        </button>
                        {/* 悬停遮罩 */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-xl pointer-events-none" />
                      </div>
                    ))}
                    {/* 上传按钮（最多9张） */}
                    {imageUrls.length < 9 && (
                      <Upload
                        multiple
                        beforeUpload={(file) => {
                          // 检查文件类型（只允许 jpg, png, jpeg, gif, webp）
                          const allowedTypes = [
                            "image/jpeg",
                            "image/jpg",
                            "image/png",
                            "image/gif",
                            "image/webp",
                          ];
                          const fileExtension = file.name
                            .split(".")
                            .pop()
                            ?.toLowerCase();
                          const allowedExtensions = [
                            "jpg",
                            "jpeg",
                            "png",
                            "gif",
                            "webp",
                          ];

                          if (
                            !allowedTypes.includes(file.type) &&
                            !allowedExtensions.includes(fileExtension || "")
                          ) {
                            message.error(t("merchantEdit.imageFormatLimit"));
                            return false;
                          }

                          // 检查文件大小（5MB = 5 * 1024 * 1024 字节）
                          const maxSize = 5 * 1024 * 1024; // 5MB
                          if (file.size > maxSize) {
                            message.error(t("merchantEdit.imageSizeLimit"));
                            return false;
                          }

                          // 将文件添加到待上传列表
                          pendingFilesRef.current.push(file);
                          return false; // 阻止默认上传
                        }}
                        onChange={() => {
                          // 当文件选择完成时，批量上传所有待上传的文件
                          if (pendingFilesRef.current.length > 0) {
                            const filesToUpload = [...pendingFilesRef.current];
                            pendingFilesRef.current = [];
                            handleBatchImageUpload(filesToUpload);
                          }
                        }}
                        fileList={fileList}
                        listType="picture-card"
                        maxCount={9}
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        showUploadList={false}
                        className="upload-wrapper"
                      >
                        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-500 transition-all duration-200 cursor-pointer group">
                          {uploadingImages ? (
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

                {/* 详情图片 */}
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                  <Text className="text-sm text-slate-900">
                    {t("merchantEdit.detailImages") || "详情图片"} ({detailImagesUrls.length}/9)
                  </Text>
                  <div className="flex gap-3 flex-wrap">
                    {/* 显示已上传的详情图片 */}
                    {detailImagesUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
                          <img
                            src={
                              url.startsWith("http")
                                ? url
                                : `${API_BASE_URL_IMAGE}${url}`
                            }
                            alt={`${t("merchantEdit.detailImages") || "详情图片"} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDetailImageRemove(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors duration-200 z-10"
                          aria-label={t("ariaLabels.deleteImage")}
                        >
                          <CloseCircleFilled className="text-xs" />
                        </button>
                        {/* 悬停遮罩 */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-xl pointer-events-none" />
                      </div>
                    ))}
                    {/* 上传按钮（最多9张） */}
                    {detailImagesUrls.length < 9 && (
                      <Upload
                        multiple
                        beforeUpload={(file) => {
                          // 检查文件类型（只允许 jpg, png, jpeg, gif, webp）
                          const allowedTypes = [
                            "image/jpeg",
                            "image/jpg",
                            "image/png",
                            "image/gif",
                            "image/webp",
                          ];
                          const fileExtension = file.name
                            .split(".")
                            .pop()
                            ?.toLowerCase();
                          const allowedExtensions = [
                            "jpg",
                            "jpeg",
                            "png",
                            "gif",
                            "webp",
                          ];

                          if (
                            !allowedTypes.includes(file.type) &&
                            !allowedExtensions.includes(fileExtension || "")
                          ) {
                            message.error(t("merchantEdit.imageFormatLimit"));
                            return false;
                          }

                          // 检查文件大小（5MB = 5 * 1024 * 1024 字节）
                          const maxSize = 5 * 1024 * 1024; // 5MB
                          if (file.size > maxSize) {
                            message.error(t("merchantEdit.imageSizeLimit"));
                            return false;
                          }

                          // 将文件添加到待上传列表
                          pendingDetailFilesRef.current.push(file);
                          return false; // 阻止默认上传
                        }}
                        onChange={() => {
                          // 当文件选择完成时，批量上传所有待上传的文件
                          if (pendingDetailFilesRef.current.length > 0) {
                            const filesToUpload = [...pendingDetailFilesRef.current];
                            pendingDetailFilesRef.current = [];
                            handleBatchDetailImageUpload(filesToUpload);
                          }
                        }}
                        fileList={detailImagesFileList}
                        listType="picture-card"
                        maxCount={9}
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        showUploadList={false}
                        className="upload-wrapper"
                      >
                        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-500 transition-all duration-200 cursor-pointer group">
                          {uploadingDetailImages ? (
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

                {/* 商品规格 */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <Text className="text-sm text-slate-900">
                      {t("merchantEdit.specifications") || "商品规格"}
                    </Text>
                    <Button
                      type="link"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={handleAddSpecification}
                      className="!p-0 !h-auto"
                    >
                      {t("merchantEdit.addSpecification") || "添加规格"}
                    </Button>
                  </div>

                  {specifications.length === 0 ? (
                    <div className="text-center py-4 text-slate-400 text-sm">
                      {t("merchantEdit.noSpecifications") || "暂无规格，点击上方按钮添加"}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {specifications.map((spec, specIndex) => (
                        <div
                          key={specIndex}
                          className="bg-slate-50 rounded-lg p-4 border border-slate-200"
                        >
                          <div className="flex items-start gap-2 mb-3">
                            <div className="flex-1">
                              <Text className="text-xs text-slate-600 mb-1 block">
                                {t("merchantEdit.specName") || "规格名称"}
                              </Text>
                              <Input
                                placeholder={
                                  t("merchantEdit.specNamePlaceholder") ||
                                  "例如：颜色、尺寸"
                                }
                                value={spec.spec_name}
                                onChange={(e) =>
                                  handleSpecNameChange(specIndex, e.target.value)
                                }
                                className="!border-slate-300"
                              />
                            </div>
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={() => handleRemoveSpecification(specIndex)}
                              className="!mt-6"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Text className="text-xs text-slate-600">
                                {t("merchantEdit.specOptions") || "规格选项"}
                              </Text>
                              <Button
                                type="link"
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => handleAddOption(specIndex)}
                                className="!p-0 !h-auto text-xs"
                              >
                                {t("merchantEdit.addOption") || "添加选项"}
                              </Button>
                            </div>

                            {spec.options.map((option, optionIndex) => (
                              <div
                                key={optionIndex}
                                className="flex items-center gap-2"
                              >
                                <Input
                                  placeholder={
                                    t("merchantEdit.optionPlaceholder") ||
                                    "输入选项值"
                                  }
                                  value={option}
                                  onChange={(e) =>
                                    handleOptionChange(
                                      specIndex,
                                      optionIndex,
                                      e.target.value
                                    )
                                  }
                                  className="!border-slate-300"
                                />
                                {spec.options.length > 1 && (
                                  <Button
                                    type="text"
                                    danger
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    onClick={() =>
                                      handleRemoveOption(specIndex, optionIndex)
                                    }
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
          loading={submitting}
        >
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
