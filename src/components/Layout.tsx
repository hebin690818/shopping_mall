import { useEffect } from "react";
import { Layout } from "antd";
import { Outlet, useLocation } from "react-router-dom";
import BottomNavigation from "./BottomNavigation";
import { ROUTES } from "../routes";

// 页面切换时滚动到顶部
function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  return null;
}

export default function AppLayout() {
  const location = useLocation();

  // 只有这四个页面显示底部菜单栏
  const showBottomNav = ([
    ROUTES.HOME,
    ROUTES.MERCHANT,
    ROUTES.ORDERS,
    ROUTES.PROFILE,
  ] as string[]).includes(location.pathname);

  return (
    <Layout className="min-h-screen bg-slate-50">
      <ScrollToTop />
      <Outlet />
      {showBottomNav && <BottomNavigation />}
    </Layout>
  );
}

