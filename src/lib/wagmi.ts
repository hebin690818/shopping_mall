import { http, createConfig } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors'
import { defineChain } from 'viem'

// 扩展 Window 接口以支持 OKX 钱包
declare global {
  interface Window {
    okxwallet?: {
      ethereum?: any
      [key: string]: any
    }
  }
}

// BSC主网配置
export const bscMainnet = defineChain({
  id: 56,
  name: 'BNB Smart Chain Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'BNB',
    symbol: 'BNB',
  },
  rpcUrls: {
    default: {
      http: [
        'https://bsc-dataseed1.binance.org',
        'https://bsc-dataseed2.binance.org',
        'https://bsc-dataseed1.defibit.io',
        'https://bsc-dataseed1.nodereal.io',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'BscScan',
      url: 'https://bscscan.com',
    },
  },
  testnet: false,
})

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID

// 检测 OKX 钱包 provider
const getOKXProvider = () => {
  if (typeof window !== 'undefined') {
    // OKX 钱包可能通过 window.okxwallet 或 window.okxwallet.ethereum 注入
    if (window.okxwallet?.ethereum) {
      return window.okxwallet.ethereum
    }
    if (window.okxwallet) {
      return window.okxwallet
    }
  }
  return undefined
}

const connectors = []

// 检测 OKX 钱包并添加专用 connector
const okxProvider = getOKXProvider()
if (okxProvider) {
  connectors.push(
    injected({
      shimDisconnect: true,
      target: {
        id: 'okx',
        name: 'OKX Wallet',
        provider: okxProvider,
      },
    }),
  )
}

// 添加通用注入式钱包 connector（用于其他钱包如 MetaMask 等）
// 注意：如果 OKX 钱包已经通过上面的专用 connector 添加，这里不会重复添加
connectors.push(injected({ shimDisconnect: true }))
connectors.push(coinbaseWallet({ appName: 'Shopping Mall Web3' }))

if (projectId) {
  connectors.push(
    walletConnect({
      projectId,
      showQrModal: true,
    }),
  )
}

export const wagmiConfig = createConfig({
  chains: [bscMainnet, mainnet, sepolia],
  transports: {
    [bscMainnet.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  connectors,
  ssr: false,
})

