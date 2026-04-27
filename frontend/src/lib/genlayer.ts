// GenLayer SDK glue.
//
// Wallet model: MetaMask (primary). User connects via window.ethereum,
// frontend programmatically adds the GenLayer studionet (chain id 61999)
// to MetaMask if missing, then signs txs through the standard EIP-1193
// provider. genlayer-js routes signing requests to the provider when one
// is passed in createClient({ provider }).
//
// Token model: bets in the deployed PredictionArena contract use the
// native chain currency (GEN) via gl.message.value. The frontend brands
// the user's spending balance as "PARENA" — a purely internal token
// tracked in the zustand store with a faucet (+1000 per click). The
// numeric amount sent on-chain equals the PARENA stake the user picks.

import { createClient, chains } from 'genlayer-js'

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as
  | `0x${string}`
  | undefined

/** Which mock market id mirrors to the deployed contract. */
export const LIVE_MARKET_ID =
  (import.meta.env.VITE_LIVE_MARKET_ID as string | undefined) ??
  'bra-jam-20240605'

const STUDIONET_CHAIN_ID_HEX = '0xf22f' // 61999
const STUDIONET_PARAMS = {
  chainId: STUDIONET_CHAIN_ID_HEX,
  chainName: 'Genlayer Studio Network',
  rpcUrls: ['https://studio.genlayer.com/api'],
  nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
  blockExplorerUrls: [],
}

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener?: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => void
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider
  }
}

let cachedAddress: `0x${string}` | null = null
let cachedClient: ReturnType<typeof createClient> | null = null

function getProvider(): Eip1193Provider {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not detected — install it from metamask.io')
  }
  return window.ethereum
}

async function ensureStudionet(provider: Eip1193Provider): Promise<void> {
  // Try to switch first; if MetaMask doesn't know the chain (4902), add it.
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
    })
  } catch (err) {
    const code = (err as { code?: number })?.code
    if (code === 4902 || code === -32603) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [STUDIONET_PARAMS],
      })
    } else {
      throw err
    }
  }
}

export async function connectMetaMask(): Promise<`0x${string}`> {
  const provider = getProvider()
  const accounts = (await provider.request({
    method: 'eth_requestAccounts',
  })) as string[]
  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts returned by MetaMask')
  }
  await ensureStudionet(provider)
  cachedAddress = accounts[0] as `0x${string}`
  cachedClient = createClient({
    chain: chains.studionet,
    account: cachedAddress,
    // genlayer-js routes signing requests through this provider
    provider: provider as unknown as never,
  })
  return cachedAddress
}

export function disconnect(): void {
  cachedAddress = null
  cachedClient = null
}

export function isEnabled(): boolean {
  return !!CONTRACT_ADDRESS
}

export function isLiveMarket(marketId: string): boolean {
  return isEnabled() && marketId === LIVE_MARKET_ID
}

export function getUserAddress(): `0x${string}` | null {
  return cachedAddress
}

function requireClient() {
  if (!cachedClient || !cachedAddress) {
    throw new Error('Wallet not connected')
  }
  if (!CONTRACT_ADDRESS) {
    throw new Error('VITE_CONTRACT_ADDRESS not set')
  }
  return { client: cachedClient, contract: CONTRACT_ADDRESS }
}

// ─── On-chain market shape (matches PredictionArena.get_data dict) ────

export type ContractMarketData = {
  question: string
  resolution_url: string
  options: string[]
  option_pools: number[]
  total_pool: number
  has_resolved: boolean
  winner: number
  reasoning: string
}

export async function getData(): Promise<ContractMarketData> {
  const { client, contract } = requireClient()
  const result = await client.readContract({
    address: contract,
    functionName: 'get_data',
  })
  return result as unknown as ContractMarketData
}

export async function placeBet(
  optionIdx: number,
  amount: bigint,
): Promise<`0x${string}`> {
  const { client, contract } = requireClient()
  const hash = await client.writeContract({
    address: contract,
    functionName: 'place_bet',
    kwargs: { option_idx: optionIdx },
    value: amount,
  })
  await client.waitForTransactionReceipt({ hash })
  return hash
}

export async function resolve(): Promise<`0x${string}`> {
  const { client, contract } = requireClient()
  const hash = await client.writeContract({
    address: contract,
    functionName: 'resolve',
    value: 0n,
  })
  await client.waitForTransactionReceipt({ hash })
  return hash
}
