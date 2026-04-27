// GenLayer SDK glue.
//
// Wallet model: any EIP-1193 wallet (MetaMask, Rabby). User connects via
// window.ethereum, frontend programmatically adds the GenLayer studionet
// (chain id 61999) if missing, then signs txs through the standard
// provider. genlayer-js routes signing through the provider when one is
// passed in createClient({ provider }).
//
// Contract model: multi-market PredictionArena. One deployed contract
// holds N markets keyed by market_id. Frontend mirrors every bet on
// chain — no per-market gating. Markets are created up-front via a
// one-shot seed_markets(specs_json) call (the "Initialize on-chain"
// button in ProfilePanel).
//
// Token model: bets attach native chain currency (GEN). The frontend
// brands the user's spending balance as "PARENA" — purely display, no
// on-chain token.

import { createClient, chains } from 'genlayer-js'

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as
  | `0x${string}`
  | undefined

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
    throw new Error('Wallet not detected — install MetaMask or Rabby')
  }
  return window.ethereum
}

async function ensureStudionet(provider: Eip1193Provider): Promise<void> {
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
    throw new Error('No accounts returned by wallet')
  }
  await ensureStudionet(provider)
  cachedAddress = accounts[0] as `0x${string}`
  cachedClient = createClient({
    chain: chains.studionet,
    account: cachedAddress,
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

export function getUserAddress(): `0x${string}` | null {
  return cachedAddress
}

/** Real on-chain GEN balance for the connected wallet, in wei. */
export async function getChainBalance(): Promise<bigint> {
  if (!cachedAddress) throw new Error('Wallet not connected')
  const provider = getProvider()
  const hex = (await provider.request({
    method: 'eth_getBalance',
    params: [cachedAddress, 'latest'],
  })) as string
  return BigInt(hex)
}

/** URL to top up testnet GEN for the connected wallet. */
export const STUDIO_FAUCET_URL = 'https://studio.genlayer.com/faucet'

function requireClient() {
  if (!cachedClient || !cachedAddress) {
    throw new Error('Wallet not connected')
  }
  if (!CONTRACT_ADDRESS) {
    throw new Error('VITE_CONTRACT_ADDRESS not set')
  }
  return { client: cachedClient, contract: CONTRACT_ADDRESS }
}

// ─── On-chain market shape (matches PredictionArena.get_market dict) ──

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

export type MarketSpec = {
  id: string
  question: string
  resolution_url: string
  options: string[]
}

// ─── Reads ────────────────────────────────────────────────────────────

export async function getMarket(
  marketId: string,
): Promise<ContractMarketData | null> {
  const { client, contract } = requireClient()
  const result = await client.readContract({
    address: contract,
    functionName: 'get_market',
    kwargs: { market_id: marketId },
  })
  // Empty dict means "not found" (contract returns {} for missing markets).
  if (
    !result ||
    typeof result !== 'object' ||
    Object.keys(result as object).length === 0
  ) {
    return null
  }
  return result as unknown as ContractMarketData
}

export async function listMarkets(): Promise<{
  market_ids: string[]
  markets: Record<string, ContractMarketData>
}> {
  const { client, contract } = requireClient()
  const result = await client.readContract({
    address: contract,
    functionName: 'list_markets',
  })
  return result as unknown as {
    market_ids: string[]
    markets: Record<string, ContractMarketData>
  }
}

// ─── Writes ───────────────────────────────────────────────────────────

export async function placeBet(
  marketId: string,
  optionIdx: number,
  amount: bigint,
): Promise<`0x${string}`> {
  const { client, contract } = requireClient()
  const hash = await client.writeContract({
    address: contract,
    functionName: 'place_bet',
    kwargs: { market_id: marketId, option_idx: optionIdx },
    value: amount,
  })
  await client.waitForTransactionReceipt({ hash })
  return hash
}

export async function resolve(marketId: string): Promise<`0x${string}`> {
  const { client, contract } = requireClient()
  const hash = await client.writeContract({
    address: contract,
    functionName: 'resolve',
    kwargs: { market_id: marketId },
    value: 0n,
  })
  await client.waitForTransactionReceipt({ hash })
  return hash
}

export async function createMarket(
  marketId: string,
  question: string,
  resolutionUrl: string,
  optionsJson: string,
): Promise<`0x${string}`> {
  const { client, contract } = requireClient()
  const hash = await client.writeContract({
    address: contract,
    functionName: 'create_market',
    kwargs: {
      market_id: marketId,
      question,
      resolution_url: resolutionUrl,
      options_json: optionsJson,
    },
    value: 0n,
  })
  await client.waitForTransactionReceipt({ hash })
  return hash
}

export async function seedMarkets(specs: MarketSpec[]): Promise<`0x${string}`> {
  const { client, contract } = requireClient()
  const hash = await client.writeContract({
    address: contract,
    functionName: 'seed_markets',
    kwargs: { specs_json: JSON.stringify(specs) },
    value: 0n,
  })
  await client.waitForTransactionReceipt({ hash })
  return hash
}

export async function proposeMarketFromNews(
  marketId: string,
  newsUrl: string,
): Promise<`0x${string}`> {
  const { client, contract } = requireClient()
  const hash = await client.writeContract({
    address: contract,
    functionName: 'propose_market_from_news',
    kwargs: { market_id: marketId, news_url: newsUrl },
    value: 0n,
  })
  await client.waitForTransactionReceipt({ hash })
  return hash
}
