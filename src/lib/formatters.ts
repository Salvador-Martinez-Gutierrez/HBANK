/**
 * FORMATTING UTILITIES
 * Funciones de formato extraídas y mejoradas
 */

// Format currency amounts with proper decimals
export const formatCurrency = (
  amount: number, 
  decimals = 6, 
  currency?: string
): string => {
  const formatted = amount.toFixed(decimals).replace(/\.?0+$/, '')
  return currency ? `${formatted} ${currency}` : formatted
}

// Format Hedera account ID for display
export const formatAccountId = (accountId: string): string => {
  if (!accountId) return ''
  
  // If it's a full account ID, truncate middle
  if (accountId.length > 12) {
    return `${accountId.slice(0, 6)}...${accountId.slice(-6)}`
  }
  
  return accountId
}

// Format timestamp for user display
export const formatTimestamp = (timestamp: string | number): string => {
  const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp * 1000)
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(date)
}

// Format time duration (e.g., for withdrawal locks)
export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ${hours % 24}h`
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

// Format percentage
export const formatPercentage = (value: number, decimals = 2): string => {
  return `${(value * 100).toFixed(decimals)}%`
}

// Format large numbers (K, M, B)
export const formatLargeNumber = (num: number, decimals = 2): string => {
  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(decimals)}B`
  } else if (num >= 1e6) {
    return `${(num / 1e6).toFixed(decimals)}M`
  } else if (num >= 1e3) {
    return `${(num / 1e3).toFixed(decimals)}K`
  }
  return num.toFixed(decimals)
}