import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntdApp } from 'antd'
import { I18nextProvider } from 'react-i18next'
import App from './App.tsx'
import { wagmiConfig } from './lib/wagmi'
import i18n from './i18n/config'
import './index.css'
import 'antd/dist/reset.css'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: '#1677ff',
                borderRadius: 12,
              },
            }}
          >
            <AntdApp>
              <App />
            </AntdApp>
          </ConfigProvider>
        </I18nextProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
