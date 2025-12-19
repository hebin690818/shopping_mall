import { http, createConfig } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors'
import { defineChain } from 'viem'

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

const connectors = [
  injected({ shimDisconnect: true }),
  coinbaseWallet({ appName: 'Shopping Mall Web3' }),
]

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

