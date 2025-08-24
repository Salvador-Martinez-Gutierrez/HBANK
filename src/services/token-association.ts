"use client";

import { TESTNET_MIRROR_NODE_ENDPOINT, TOKEN_IDS } from "@/app/constants";

// Validation Cloud API configuration
const VALIDATION_CLOUD_API_KEY = process.env.NEXT_PUBLIC_VALIDATION_CLOUD_API_KEY;

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
  if (!VALIDATION_CLOUD_API_KEY) {
    console.error("Validation Cloud API key not configured");
    return false;
  }

  try {
    const url = `${TESTNET_MIRROR_NODE_ENDPOINT}/${VALIDATION_CLOUD_API_KEY}/api/v1/accounts/${accountId}/tokens?token.id=${TOKEN_IDS.hUSD}`;
    
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
  if (!VALIDATION_CLOUD_API_KEY) {
    console.error("Validation Cloud API key not configured");
    return 0;
  }

  try {
    const url = `${TESTNET_MIRROR_NODE_ENDPOINT}/${VALIDATION_CLOUD_API_KEY}/api/v1/accounts/${accountId}/tokens?token.id=${TOKEN_IDS.hUSD}`;
    
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
