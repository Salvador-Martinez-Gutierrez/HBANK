import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const accountId = (req.query.accountId as string) || ''
  if (!accountId) {
    return res.status(400).json({ error: 'accountId is required' })
  }

  try {
    const apiKey = process.env.VALIDATION_CLOUD_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing VALIDATION_CLOUD_API_KEY' })
    }

    // Base URL without trailing slash, e.g. https://testnet.hedera.validationcloud.io
    const baseUrl = process.env.VALIDATION_CLOUD_BASE_URL || 'https://testnet.hedera.validationcloud.io/v1'

    const url = `${baseUrl}/${apiKey}/api/v1/accounts/${accountId}`
    console.log('📡 [account-balances] Requesting:', url)

    const response = await fetch(url)
    if (!response.ok) {
      console.error('Mirror node error:', response.status, response.statusText)
      return res.status(502).json({ error: 'Upstream mirror node error' })
    }

    const data = await response.json()
    console.log('🔎 [account-balances] Response:', data)

    const tinybar = data?.balance?.balance ?? 0
    const hbar = (tinybar / 100000000).toFixed(2)

    let usdc = '0.00'
    let husd = '0.00'

    const TOKEN_IDS = {
      USDC: '0.0.429274',
      hUSD: '0.0.6624430',
    } as const

    const DECIMALS_BY_TOKEN_ID: Record<string, number> = {
      [TOKEN_IDS.USDC]: 6,
      [TOKEN_IDS.hUSD]: 0,
    }

    const tokens = Array.isArray(data?.balance?.tokens)
      ? data.balance.tokens
      : Array.isArray(data?.tokens)
      ? data.tokens
      : []

    for (const t of tokens) {
      if (t.token_id === TOKEN_IDS.USDC) {
        const decimals = typeof t.decimals === 'number' ? t.decimals : DECIMALS_BY_TOKEN_ID[TOKEN_IDS.USDC]
        usdc = (t.balance / Math.pow(10, decimals)).toFixed(2)
      }
      if (t.token_id === TOKEN_IDS.hUSD) {
        const decimals = typeof t.decimals === 'number' ? t.decimals : DECIMALS_BY_TOKEN_ID[TOKEN_IDS.hUSD]
        husd = (t.balance / Math.pow(10, decimals)).toFixed(2)
      }
    }

    return res.status(200).json({ hbar, usdc, husd })
  } catch (err) {
    console.error('Error in account-balances route:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}


