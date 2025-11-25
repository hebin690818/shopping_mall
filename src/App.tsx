import { useEffect, useMemo, useState } from 'react'
import { Layout, Typography, Button, Card, Space, Tag, Select } from 'antd'
import { useTranslation } from 'react-i18next'
import { useAccount, useChainId, useChains, useConnect, useDisconnect } from 'wagmi'
import './App.css'

type Product = {
  id: string
  nameKey: string
  descKey: string
  badgeKey: string
  price: string
}

const { Header, Content, Footer } = Layout
const { Title, Paragraph, Text } = Typography

const products: Product[] = [
  {
    id: 'nft',
    nameKey: 'products.nftSneaker',
    descKey: 'products.nftSneakerDesc',
    badgeKey: 'badges.nft',
    price: '0.25',
  },
  {
    id: 'metaverse',
    nameKey: 'products.metaverseSuite',
    descKey: 'products.metaverseSuiteDesc',
    badgeKey: 'badges.metaverse',
    price: '1.20',
  },
  {
    id: 'loyalty',
    nameKey: 'products.loyaltyPass',
    descKey: 'products.loyaltyPassDesc',
    badgeKey: 'badges.loyalty',
    price: '0.05',
  },
]

function App() {
  const { t, i18n } = useTranslation('common')
  const { address, status } = useAccount()
  const { connect, connectors, isPending, error } = useConnect()
  const { disconnect } = useDisconnect()
  const chains = useChains()
  const chainId = useChainId()
  const [connectorUid, setConnectorUid] = useState<string>()

  useEffect(() => {
    if (!connectorUid && connectors.length) {
      setConnectorUid(connectors[0].uid)
    }
  }, [connectors, connectorUid])

  const selectedConnector = useMemo(
    () => connectors.find((item) => item.uid === connectorUid),
    [connectors, connectorUid],
  )

  const currentChain = useMemo(
    () => chains.find((item) => item.id === chainId),
    [chains, chainId],
  )

  const walletStatusLabel = useMemo(() => {
    if (status === 'connected') {
      return t('wallet.connected')
    }
    if (status === 'connecting' || status === 'reconnecting') {
      return t('wallet.pending', {
        connector: selectedConnector?.name ?? '',
      })
    }
    return t('wallet.disconnected')
  }, [selectedConnector?.name, status, t])

  const handlePrimaryAction = () => {
    if (address) {
      disconnect()
      return
    }

    if (selectedConnector) {
      connect({ connector: selectedConnector })
    }
  }

  const languageOptions = useMemo(
    () => [
      { value: 'en', label: t('languageOptions.en') },
      { value: 'zh', label: t('languageOptions.zh') },
    ],
    [t],
  )

  return (
    <Layout className="min-h-screen bg-slate-50">
      <Header className="flex items-center justify-between bg-white px-6 shadow-sm">
        <Text className="text-lg font-semibold text-slate-900">{t('brand')}</Text>
        <Space size="middle">
          <Select
            value={i18n.language}
            onChange={(lng) => i18n.changeLanguage(lng)}
            options={languageOptions}
            style={{ width: 120 }}
          />
          <Button
            type="primary"
            onClick={handlePrimaryAction}
            loading={isPending}
            disabled={!address && !selectedConnector}
          >
            {address ? t('wallet.disconnect') : t('wallet.connect')}
          </Button>
        </Space>
      </Header>
      <Content className="px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <Card
            id="hero"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
            bordered={false}
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <Title level={2} className="!text-white !mb-0">
                  {t('heroTitle')}
                </Title>
                <Paragraph className="!text-white/80 !mb-0">{t('heroDescription')}</Paragraph>
              </div>

              <div className="grid gap-6 md:grid-cols-[1.4fr,0.8fr]">
                <div className="space-y-4">
                  <Select
                    size="large"
                    className="w-full"
                    placeholder={t('wallet.selectConnector')}
                    value={connectorUid}
                    disabled={!connectors.length}
                    onChange={(uid) => setConnectorUid(uid)}
                    options={connectors.map((connector) => ({
                      value: connector.uid,
                      label: connector.name,
                      disabled: !connector.ready,
                    }))}
                  />
                  <Button
                    block
                    size="large"
                    type="primary"
                    onClick={handlePrimaryAction}
                    loading={isPending}
                    disabled={!address && !selectedConnector}
                  >
                    {address ? t('wallet.disconnect') : t('wallet.connect')}
                  </Button>
                  {error && (
                    <Text type="danger" className="block text-sm">
                      {error.message}
                    </Text>
                  )}
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <Text className="text-xs uppercase tracking-wide text-white/70">
                    {t('wallet.status')}
                  </Text>
                  <Title level={4} className="!text-white !mb-2">
                    {walletStatusLabel}
                  </Title>
                  {address ? (
                    <Text className="font-mono text-white">{address}</Text>
                  ) : (
                    <Text className="text-white/80">{t('wallet.disconnected')}</Text>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <Space direction="vertical" size="small">
                <Text className="text-sm font-medium text-slate-500">{t('network.title')}</Text>
                <Title level={3} className="!mb-1">
                  {currentChain ? currentChain.name : t('network.unsupported')}
                </Title>
                {currentChain && (
                  <Tag color="blue" className="w-fit">
                    {currentChain.id}
                  </Tag>
                )}
              </Space>
            </Card>

            <Card>
              <Space direction="vertical" size="small">
                <Text className="text-sm font-medium text-slate-500">{t('wallet.status')}</Text>
                <Title level={3} className="!mb-1">
                  {walletStatusLabel}
                </Title>
                {address && <Text className="font-mono text-slate-500">{address}</Text>}
              </Space>
            </Card>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <Text className="text-sm uppercase tracking-wide text-slate-500">
                  {t('productsTitle')}
                </Text>
                <Title level={3} className="!mb-0">
                  {t('cta')}
                </Title>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {products.map((product) => (
                <Card key={product.id} bordered>
                  <Space direction="vertical" size="middle" className="w-full">
                    <Tag color="purple" className="w-fit">
                      {t(product.badgeKey)}
                    </Tag>
                    <div>
                      <Title level={4} className="!mb-1">
                        {t(product.nameKey)}
                      </Title>
                      <Paragraph className="!mb-0 text-slate-500">
                        {t(product.descKey)}
                      </Paragraph>
                    </div>
                    <Space align="center" className="w-full justify-between">
                      <Text className="text-lg font-semibold text-slate-900">
                        {t('product.price', { value: product.price })}
                      </Text>
                      <Button type="primary">{t('product.buy')}</Button>
                    </Space>
                  </Space>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </Content>
      <Footer className="bg-white text-center text-slate-500">{t('footer')}</Footer>
    </Layout>
  )
}

export default App
