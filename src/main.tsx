import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntdApp } from 'antd'
import { I18nextProvider } from 'react-i18next'
import App from './App.tsx'
import { wagmiConfig } from './lib/wagmi'
import i18n from './i18n/config'
import { LoadingProvider } from './contexts/LoadingProvider'
import './index.css'
import 'antd/dist/reset.css'

const queryClient = new QueryClient()

// 全局禁用输入框自动填充
const disableAutocomplete = () => {
  // 设置所有输入框的autocomplete属性
  const setAutocomplete = () => {
    const inputs = document.querySelectorAll('input, textarea, select')
    inputs.forEach((input) => {
      if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) {
        input.setAttribute('autocomplete', 'off')
        input.setAttribute('autoComplete', 'off')
        input.setAttribute('data-form-type', 'other')
      }
    })
  }

  // 初始设置
  setAutocomplete()

  // 监听DOM变化，对新添加的输入框也设置
  const observer = new MutationObserver(() => {
    setAutocomplete()
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  return () => observer.disconnect()
}

// 在DOM加载完成后执行
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', disableAutocomplete)
  } else {
    disableAutocomplete()
  }
}

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
              <LoadingProvider>
                <App />
              </LoadingProvider>
            </AntdApp>
          </ConfigProvider>
        </I18nextProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
