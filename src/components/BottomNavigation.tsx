import { HomeOutlined, ShopOutlined, ShoppingCartOutlined, UserOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { ROUTES } from '../routes'

type NavItem = {
  path: string
  icon: React.ReactNode
  label: string
}

export default function BottomNavigation() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const location = useLocation()

  const navItems: NavItem[] = [
    {
      path: ROUTES.HOME,
      icon: <HomeOutlined className="text-xl" />,
      label: t('navigation.home'),
    },
    {
      path: ROUTES.MERCHANT,
      icon: <ShopOutlined className="text-xl" />,
      label: t('navigation.merchant'),
    },
    {
      path: ROUTES.ORDERS,
      icon: <ShoppingCartOutlined className="text-xl" />,
      label: t('navigation.orders'),
    },
    {
      path: ROUTES.PROFILE,
      icon: <UserOutlined className="text-xl" />,
      label: t('navigation.profile'),
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-0 flex-1 transition-colors ${
              location.pathname === item.path
                ? 'text-purple-500'
                : 'text-slate-500'
            }`}
          >
            {item.icon}
            <span className="text-xs">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

