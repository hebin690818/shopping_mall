import { useState } from 'react'
import { Card, Tag, Button, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CarOutlined,
} from '@ant-design/icons'
import product from '@/assets/product.png'

const { Text, Title } = Typography

type OrderStatus = 'pending' | 'delivering' | 'completed'

type Order = {
  id: string
  orderNumber: string
  date: string
  status: OrderStatus
  product: {
    image: string
    name: string
    store: string
    price: string
    quantity: number
  }
  total: string
}

const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-2024-001',
    date: '2024-11-20',
    status: 'completed',
    product: {
      image: product,
      name: '无线蓝牙耳机 Pro',
      store: '科技数码旗舰店',
      price: '299.99',
      quantity: 1,
    },
    total: '299.99',
  },
  {
    id: '2',
    orderNumber: 'ORD-2024-002',
    date: '2024-11-22',
    status: 'delivering',
    product: {
      image: product,
      name: '智能运动手环',
      store: '科技数码旗舰店',
      price: '299.99',
      quantity: 1,
    },
    total: '299.99',
  },
  {
    id: '3',
    orderNumber: 'ORD-2024-003',
    date: '2024-11-24',
    status: 'pending',
    product: {
      image: product,
      name: '便携式蓝牙音箱',
      store: '科技数码旗舰店',
      price: '299.99',
      quantity: 1,
    },
    total: '299.99',
  },
]

export default function OrdersPage() {
  const { t } = useTranslation('common')
  const [activeTab, setActiveTab] = useState<string>('all')

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircleOutlined />
      case 'delivering':
        return <CarOutlined />
      case 'pending':
        return <ClockCircleOutlined />
    }
  }

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'completed':
        return 'purple'
      case 'delivering':
        return 'blue'
      case 'pending':
        return 'orange'
    }
  }

  const filteredOrders =
    activeTab === 'all'
      ? mockOrders
      : mockOrders.filter((order) => order.status === activeTab)

  const tabs = [
    { key: 'all', label: t('orders.tabs.all') },
    { key: 'pending', label: t('orders.tabs.pending') },
    { key: 'delivering', label: t('orders.tabs.delivering') },
    { key: 'completed', label: t('orders.tabs.completed') },
  ]

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-4 pt-12 pb-6">
        <Title level={3} className="!text-white !mb-2">
          {t('orders.title')}
        </Title>
        <Text className="text-white/80 text-sm">
          {t('orders.total', { count: mockOrders.length })}
        </Text>
      </div>

      {/* Tabs */}
      <div className="bg-white px-4 py-3 flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="px-4 py-4 space-y-4">
        {filteredOrders.map((order) => (
          <Card key={order.id} className="!rounded-xl shadow-sm">
            <div className="space-y-3">
              {/* Order Header */}
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-xs text-slate-500">
                    {t('orders.orderNumber')}: {order.orderNumber}
                  </Text>
                  <div>
                    <Text className="text-xs text-slate-500">{order.date}</Text>
                  </div>
                </div>
                <Tag
                  color={getStatusColor(order.status)}
                  icon={getStatusIcon(order.status)}
                  className="!rounded-full"
                >
                  {t(`orders.status.${order.status}`)}
                </Tag>
              </div>

              {/* Product Info */}
              <div className="flex gap-3">
                <img
                  src={order.product.image}
                  alt={order.product.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <Text className="text-sm font-medium block mb-1">
                    {order.product.name}
                  </Text>
                  <Text className="text-xs text-slate-500 block mb-1">
                    {order.product.store}
                  </Text>
                  <div className="flex items-center justify-between">
                    <Text className="text-sm font-semibold text-red-500">
                      ${order.product.price}
                    </Text>
                    <Text className="text-xs text-slate-500">
                      x{order.product.quantity}
                    </Text>
                  </div>
                </div>
              </div>

              {/* Total and Actions */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                {/* Total Price - Top Right */}
                <div className="flex justify-end">
                  <Text className="text-sm font-semibold">
                    {t('orders.totalPrice')}: ${order.total}
                  </Text>
                </div>
                {/* Action Buttons - Bottom */}
                {order.status === 'delivering' ? (
                  <div className="flex justify-end gap-2">
                    <Button
                      size="small"
                      className="!rounded-full !bg-white !border-slate-300 !text-slate-900 hover:!bg-slate-50"
                    >
                      {t('orders.viewDetails')}
                    </Button>
                    <Button
                      size="small"
                      className="!rounded-full !bg-white !border-purple-400 !text-slate-900 hover:!bg-purple-50"
                    >
                      {t('orders.viewLogistics')}
                    </Button>
                    <Button
                      size="small"
                      className="!rounded-full !bg-slate-800 !border-purple-600 !text-white hover:!bg-slate-700"
                    >
                      {t('orders.confirmReceipt')}
                    </Button>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <Button
                      size="small"
                      className="!rounded-full !bg-white !border-slate-300 !text-slate-900 hover:!bg-slate-50"
                    >
                      {t('orders.viewDetails')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

