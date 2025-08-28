"use client";

import { TOKEN_IDS } from "@/app/constants";

interface TokenRelationship {
  automatic_association: boolean;
  balance: number;
  created_timestamp: number;
  freeze_status: "FROZEN" | "UNFROZEN";
  kyc_status: "GRANTED" | "REVOKED" | "NOT_APPLICABLE";
  token_id: string;
}

interface TokenRelationshipsResponse {
  tokens: TokenRelationship[];
  links?: {
    next?: string;
  };
}

/**
 * Checks if an account has the hUSD token associated
 * @param accountId - The Hedera account ID (e.g., "0.0.123456")
 * @returns Promise<boolean> - True if token is associated, false otherwise
 */
export async function checkTokenAssociation(accountId: string): Promise<boolean> {
  try {
    // Use the standard Hedera mirror node endpoint (same as useTokenBalances)
    const url = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}/tokens?token.id=${TOKEN_IDS.hUSD}`;
    console.log("📡 Making API request to:", url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch token relationships: ${response.status} ${response.statusText}`);
      return false;
    }

    const data: TokenRelationshipsResponse = await response.json();

    console.log("token relationships", data);
    
    // Check if hUSD token is in the relationships
    const hasTokenAssociation = data.tokens.some(
      (token) => token.token_id === TOKEN_IDS.hUSD
    );
    
    return hasTokenAssociation;
  } catch (error) {
    console.error("Error checking token association:", error);
    return false;
  }
}

/**
 * Gets the balance of hUSD tokens for an account
 * @param accountId - The Hedera account ID
 * @returns Promise<number> - The token balance, or 0 if not associated
 */
export async function getTokenBalance(accountId: string): Promise<number> {
  try {
    // Use the standard Hedera mirror node endpoint
    const url = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}/tokens?token.id=${TOKEN_IDS.hUSD}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return 0;
    }

    const data: TokenRelationshipsResponse = await response.json();
    
    const tokenRelationship = data.tokens.find(
      (token) => token.token_id === TOKEN_IDS.hUSD
    );

    return tokenRelationship?.balance || 0;
  } catch (error) {
    console.error("Error getting token balance:", error);
    return 0;
  }
}
