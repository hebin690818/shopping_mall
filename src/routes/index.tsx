import { createBrowserRouter } from "react-router-dom";
import HomePage from "../pages/home";
import OrdersPage from "../pages/orders";
import OrdersListPage from "../pages/ordersList";
import ProfilePage from "../pages/profile";
import ProductDetailPage from "../pages/productDetail";
import OrderConfirmPage from "../pages/orderConfirm";
import OrderDetailPage from "../pages/orderDetail";
import PaymentSuccessPage from "../pages/paymentSuccess";
import MerchantPage from "../pages/merchant";
import MerchantApplyPage from "../pages/merchantApply";
import MerchantApplyResultPage from "../pages/merchantApplyResult";
import MerchantCenterPage from "../pages/merchantCenter";
import MerchantProductEditPage from "../pages/merchantProductEdit";
import MerchantStorePage from "../pages/merchantStore";
import SettingsPage from "../pages/settings";
import AddressEditPage from "../pages/addressEdit";
import CategoryProductsPage from "../pages/categoryProducts";
import AppLayout from "../components/Layout";

// 路由路径常量
export const ROUTES = {
  HOME: "/",
  PRODUCT_DETAIL: "/product/:id",
  ORDER_CONFIRM: "/order/confirm/:productId",
  PAYMENT_SUCCESS: "/payment/success",
  ORDERS: "/orders",
  ORDER_DETAIL: "/order/:id",
  ORDERS_LIST: "/orders/list",
  PROFILE: "/profile",
  MERCHANT: "/merchant",
  MERCHANT_APPLY: "/merchant/apply",
  MERCHANT_APPLY_RESULT: "/merchant/apply/result/:status",
  MERCHANT_CENTER: "/merchant/center",
  MERCHANT_PRODUCT_EDIT: "/merchant/product/edit/:id",
  MERCHANT_STORE: "/merchant/store/:merchantId",
  SETTINGS: "/settings",
  ADDRESS_EDIT: "/address/edit",
  CATEGORY_PRODUCTS: "/category/:categoryId/products",
} as const;

export const router = createBrowserRouter([
  {
    path: ROUTES.HOME,
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: ROUTES.PRODUCT_DETAIL,
        element: <ProductDetailPage />,
      },
      {
        path: ROUTES.ORDER_CONFIRM,
        element: <OrderConfirmPage />,
      },
      {
        path: ROUTES.PAYMENT_SUCCESS,
        element: <PaymentSuccessPage />,
      },
      {
        path: ROUTES.ORDERS,
        element: <OrdersPage />,
      },
      {
        path: ROUTES.ORDER_DETAIL,
        element: <OrderDetailPage />,
      },
      {
        path: ROUTES.ORDERS_LIST,
        element: <OrdersListPage />,
      },
      {
        path: ROUTES.PROFILE,
        element: <ProfilePage />,
      },
      {
        path: ROUTES.MERCHANT,
        element: <MerchantPage />,
      },
      {
        path: ROUTES.MERCHANT_APPLY,
        element: <MerchantApplyPage />,
      },
      {
        path: ROUTES.MERCHANT_APPLY_RESULT,
        element: <MerchantApplyResultPage />,
      },
      {
        path: ROUTES.MERCHANT_CENTER,
        element: <MerchantCenterPage />,
      },
      {
        path: ROUTES.MERCHANT_PRODUCT_EDIT,
        element: <MerchantProductEditPage />,
      },
      {
        path: ROUTES.MERCHANT_STORE,
        element: <MerchantStorePage />,
      },
      {
        path: ROUTES.SETTINGS,
        element: <SettingsPage />,
      },
      {
        path: ROUTES.ADDRESS_EDIT,
        element: <AddressEditPage />,
      },
      {
        path: ROUTES.CATEGORY_PRODUCTS,
        element: <CategoryProductsPage />,
      },
    ],
  },
]);

