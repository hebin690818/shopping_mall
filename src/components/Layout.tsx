import { useLayoutEffect } from "react";
import { Layout } from "antd";
import { Outlet, useLocation } from "react-router-dom";
import BottomNavigation from "./BottomNavigation";
import { ROUTES } from '@/routes';

// 页面切换时滚动到顶部
function ScrollToTop() {
  const location = useLocation();

  useLayoutEffect(() => {
    // 使用 useLayoutEffect 确保在 DOM 更新前就滚动，避免闪烁
    // 直接使用 scrollTo(0, 0) 确保立即滚动，兼容性最好
    window.scrollTo(0, 0);
    
    // 同时处理 document.documentElement 和 document.body，确保兼容性
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }
  }, [location.pathname, location.search, location.hash]);

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

