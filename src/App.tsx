import { useEffect, useRef, useState } from "react";
import { Layout } from "antd";
import { useTranslation } from "react-i18next";
import HomePage, { type Product } from "./pages/home";
import OrdersPage, { type Order } from "./pages/orders";
import OrdersListPage from "./pages/ordersList";
import ProfilePage from "./pages/profile";
import ProductDetailPage from "./pages/productDetail";
import OrderConfirmPage from "./pages/orderConfirm";
import OrderDetailPage from "./pages/orderDetail";
import PaymentSuccessPage from "./pages/paymentSuccess";
import MerchantPage from "./pages/merchant";
import MerchantApplyPage from "./pages/merchantApply";
import MerchantApplyResultPage from "./pages/merchantApplyResult";
import MerchantCenterPage, {
  type MerchantProduct,
} from "./pages/merchantCenter";
import MerchantProductEditPage from "./pages/merchantProductEdit";
import SettingsPage from "./pages/settings";
import AddressEditPage from "./pages/addressEdit";
import BottomNavigation from "./components/BottomNavigation";
import { useGlobalLoading } from "./contexts/LoadingProvider";
import "./App.css";

function App() {
  const [currentPage, setCurrentPage] = useState<string>("home");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [latestOrder, setLatestOrder] = useState<{
    product: Product;
    quantity: number;
    total: number;
  } | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingProduct, setEditingProduct] = useState<MerchantProduct | null>(
    null
  );
  const [isMerchant, setIsMerchant] = useState(false);
  const { showLoading, hideLoading } = useGlobalLoading();
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useTranslation("common");

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsConfirming(false);
    setShowSuccess(false);
  };

  const handlePurchase = (product: Product) => {
    setSelectedProduct(product);
    setIsConfirming(true);
    setShowSuccess(false);
  };

  const handleSubmitOrder = (payload: {
    product: Product;
    quantity: number;
    total: number;
  }) => {
    showLoading(t("globalLoading.defaultMessage"));
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }
    loadingTimerRef.current = setTimeout(() => {
      hideLoading();
      setLatestOrder(payload);
      setIsConfirming(false);
      setSelectedProduct(null);
      setShowSuccess(true);
    }, 1200);
  };

  const handleContinue = () => {
    setShowSuccess(false);
    setLatestOrder(null);
    setCurrentPage("home");
  };

  const handleViewOrders = () => {
    setShowSuccess(false);
    setLatestOrder(null);
    setCurrentPage("orders");
  };

  const handleViewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
  };

  const renderPage = () => {
    if (editingProduct) {
      return (
        <MerchantProductEditPage
          product={editingProduct}
          onBack={() => setEditingProduct(null)}
          onSave={() => {
            setEditingProduct(null);
          }}
        />
      );
    }
    if (selectedOrder) {
      return (
        <OrderDetailPage
          order={selectedOrder}
          onBack={() => setSelectedOrder(null)}
        />
      );
    }
    if (showSuccess && latestOrder) {
      return (
        <PaymentSuccessPage
          onBack={handleContinue}
          onContinue={handleContinue}
          onViewOrders={handleViewOrders}
        />
      );
    }

    if (selectedProduct && isConfirming) {
      return (
        <OrderConfirmPage
          product={selectedProduct}
          onBack={() => setIsConfirming(false)}
          onSubmit={handleSubmitOrder}
        />
      );
    }

    if (selectedProduct) {
      return (
        <ProductDetailPage
          product={selectedProduct}
          onBack={() => setSelectedProduct(null)}
          onPurchase={handlePurchase}
        />
      );
    }

    switch (currentPage) {
      case "orders":
        return <OrdersPage onViewDetails={handleViewOrderDetails} />;
      case "merchant":
        return <MerchantPage onApply={() => setCurrentPage("merchantApply")} />;
      case "merchantApply":
        return (
          <MerchantApplyPage
            onBack={() => setCurrentPage("merchant")}
            onSubmitSuccess={() => {
              setIsMerchant(true);
              setCurrentPage("merchantApplyResultSuccess");
            }}
          />
        );
      case "merchantApplyResultSuccess":
        return (
          <MerchantApplyResultPage
            status="success"
            onBack={() => setCurrentPage("merchant")}
            onPrimary={() => setCurrentPage("home")}
          />
        );
      case "merchantApplyResultFail":
        return (
          <MerchantApplyResultPage
            status="fail"
            onBack={() => setCurrentPage("merchant")}
            onPrimary={() => setCurrentPage("merchantApply")}
          />
        );
      case "profile":
        return (
          <ProfilePage
            onOpenOrders={() => setCurrentPage("ordersList")}
            onOpenMerchantCenter={() => setCurrentPage("merchantCenter")}
            onOpenSettings={() => setCurrentPage("settings")}
          />
        );
      case "merchantCenter":
        return (
          <MerchantCenterPage
            onBack={() => setCurrentPage("profile")}
            onEditProduct={(p) => setEditingProduct(p)}
          />
        );
      case "settings":
        return (
          <SettingsPage
            isMerchant={isMerchant}
            onBack={() => setCurrentPage("profile")}
            onEditAddress={() => setCurrentPage("addressEdit")}
            onSave={(values) => {
              showLoading(t("globalLoading.defaultMessage"));
              if (loadingTimerRef.current) {
                clearTimeout(loadingTimerRef.current);
              }
              loadingTimerRef.current = setTimeout(() => {
                hideLoading();
                // 这里可以添加实际的保存商家信息逻辑
                console.log("保存商家信息:", values);
              }, 1200);
            }}
          />
        );
      case "ordersList":
        return (
          <OrdersListPage
            onBack={() => setCurrentPage("profile")}
            onViewDetails={handleViewOrderDetails}
          />
        );
      case "addressEdit":
        return <AddressEditPage onBack={() => setCurrentPage("settings")} />;
      case "home":
      default:
        return <HomePage onSelectProduct={handleSelectProduct} />;
    }
  };

  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
      hideLoading();
    };
  }, [hideLoading]);

  // 页面切换时滚动到顶部
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage, selectedProduct, selectedOrder, isConfirming, showSuccess, editingProduct]);

  // 只有这四个页面显示底部菜单栏
  const showBottomNav = ["home", "merchant", "orders", "profile"].includes(
    currentPage
  ) &&
    !selectedProduct &&
    !selectedOrder &&
    !isConfirming &&
    !showSuccess &&
    !editingProduct;

  return (
    <Layout className="min-h-screen bg-slate-50">
      {renderPage()}
      {showBottomNav && (
        <BottomNavigation activeKey={currentPage} onChange={setCurrentPage} />
      )}
    </Layout>
  );
}

export default App;
