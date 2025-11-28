import { HomeOutlined, ShopOutlined, ShoppingCartOutlined, UserOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

type NavItem = {
  key: string
  icon: React.ReactNode
  label: string
}

type BottomNavigationProps = {
  activeKey: string
  onChange?: (key: string) => void
}

export default function BottomNavigation({ activeKey, onChange }: BottomNavigationProps) {
  const { t } = useTranslation('common')

  const navItems: NavItem[] = [
    {
      key: 'home',
      icon: <HomeOutlined className="text-xl" />,
      label: t('navigation.home'),
    },
    {
      key: 'merchant',
      icon: <ShopOutlined className="text-xl" />,
      label: t('navigation.merchant'),
    },
    {
      key: 'orders',
      icon: <ShoppingCartOutlined className="text-xl" />,
      label: t('navigation.orders'),
    },
    {
      key: 'profile',
      icon: <UserOutlined className="text-xl" />,
      label: t('navigation.profile'),
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onChange?.(item.key)}
            className={`flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-0 flex-1 transition-colors ${
              activeKey === item.key
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

