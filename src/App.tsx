import { useEffect, useRef, useState } from "react";
import { Layout } from "antd";
import HomePage, { type Product } from "./pages/home";
import OrdersPage from "./pages/orders";
import ProfilePage from "./pages/profile";
import ProductDetailPage from "./pages/productDetail";
import OrderConfirmPage from "./pages/orderConfirm";
import PaymentSuccessPage from "./pages/paymentSuccess";
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
  const { showLoading, hideLoading } = useGlobalLoading();
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    showLoading("正在处理支付...");
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

  const renderPage = () => {
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
        return <OrdersPage />;
      case "profile":
        return <ProfilePage />;
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

  return (
    <Layout className="min-h-screen bg-slate-50">
      {renderPage()}
      {!selectedProduct && !isConfirming && !showSuccess && (
        <BottomNavigation activeKey={currentPage} onChange={setCurrentPage} />
      )}
    </Layout>
  );
}

export default App;
