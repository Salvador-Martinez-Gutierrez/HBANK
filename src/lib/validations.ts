/**
 * VALIDATION UTILITIES
 * Extraídas de lógica repetida en múltiples componentes
 */

// Validate amount input for transactions
export const validateAmount = (
  amount: string, 
  balance?: number,
  minAmount = 0.000001
): { isValid: boolean; error?: string } => {
  if (!amount || amount === '0') {
    return { isValid: false, error: 'Please enter an amount' }
  }

  const numAmount = parseFloat(amount)
  
  if (isNaN(numAmount) || numAmount <= 0) {
    return { isValid: false, error: 'Please enter a valid amount' }
  }

  if (numAmount < minAmount) {
    return { isValid: false, error: `Minimum amount is ${minAmount}` }
  }

  if (balance && numAmount > balance) {
    return { isValid: false, error: 'Insufficient balance' }
  }

  return { isValid: true }
}

// Validate Hedera account ID format
export const validateAccountId = (accountId: string): boolean => {
  const accountIdRegex = /^0\.0\.\d+$/
  return accountIdRegex.test(accountId)
}

// Validate rate data structure
export const validateRateData = (rateData: unknown): rateData is { rate: number; sequenceNumber: string } => {
  if (!rateData || typeof rateData !== 'object') {
    return false
  }
  
  const data = rateData as Record<string, unknown>
  
  return (
    'rate' in data &&
    'sequenceNumber' in data &&
    typeof data.rate === 'number' &&
    data.rate > 0 &&
    typeof data.sequenceNumber === 'string' &&
    data.sequenceNumber.length > 0
  )
}

// Validate signer object for Hedera transactions
export const validateSigner = (signer: unknown): boolean => {
  return (
    signer !== null &&
    signer !== undefined &&
    typeof signer === 'object' &&
    'sign' in signer
  )
}