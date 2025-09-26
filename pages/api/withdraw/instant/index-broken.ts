import { NextApiRequest, NextApiResponse } from 'next'
import { HederaService } from '@/services/hederaService'
import { WithdrawService } from '@/services/withdrawService'
import { NUMERIC } from '@/app/backend-constants'
import {
    Client,
    AccountId,
    PrivateKey,
    TokenId,
    TransferTransaction,
    TopicMessageSubmitTransaction,
    TopicId,
} from '@hashgraph/sdk'

interface InstantWithdrawRequest {
    userAccountId: string
    amountHUSD: number
    rate: number
    rateSequenceNumber: string
    requestType: 'instant'
}

interface InstantWithdrawResponse {
    success: boolean
    txId?: string
    grossUSDC?: number
    fee?: number
    netUSDC?: number
    error?: string
    currentRate?: unknown // For rate conflict responses
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<InstantWithdrawResponse>
) {
    // MINIMAL TEST - solo logs básicos
    console.log('🚀 [INSTANT WITHDRAW] Starting handler...')
    console.log('📋 [INSTANT WITHDRAW] Method:', req.method)
    console.log('📋 [INSTANT WITHDRAW] Body keys:', Object.keys(req.body || {}))
    
    if (req.method !== 'POST') {
        console.log('❌ [INSTANT WITHDRAW] Method not allowed')
        return res.status(405).json({
            success: false,
            error: 'Method not allowed',
        })
    }

    try {
        console.log('🔍 [INSTANT WITHDRAW] Parsing request body...')
        
        const {
            userAccountId,
            amountHUSD,
            rate,
            rateSequenceNumber,
            requestType,
        }: InstantWithdrawRequest = req.body

        console.log('⚡ [INSTANT WITHDRAW] Data parsed successfully:', {
            userAccountId: userAccountId ? 'present' : 'missing',
            amountHUSD: amountHUSD ? 'present' : 'missing',
            rate: rate ? 'present' : 'missing',
            requestType: requestType ? 'present' : 'missing',
        })

        // Basic validation first
        if (requestType !== 'instant') {
            console.log('❌ [INSTANT WITHDRAW] Invalid request type:', requestType)
            return res.status(400).json({
                success: false,
                error: 'Invalid request type. Expected "instant"',
            })
        }

        // Validate required fields
        if (!userAccountId || !amountHUSD || !rate || !rateSequenceNumber) {
            console.log('❌ [INSTANT WITHDRAW] Missing fields:', { userAccountId: !!userAccountId, amountHUSD: !!amountHUSD, rate: !!rate, rateSequenceNumber: !!rateSequenceNumber })
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
            })
        }

        console.log('🔍 [INSTANT WITHDRAW] Creating services...')
        const withdrawService = new WithdrawService()
        const hederaService = new HederaService()
        console.log('✅ [INSTANT WITHDRAW] Services created successfully')

        // Early return for testing - remove this later
        return res.status(200).json({
            success: false, 
            error: 'Testing - services created successfully'
        })

    } catch (error) {
        console.error('❌ [INSTANT WITHDRAW] Unexpected error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        })
    }
}

        /*
        // REST OF THE CODE COMMENTED OUT FOR TESTING
        
        // Step 1: Validate rate against latest published rate in HCS
        const isRateValid = await withdrawService.validateRate(
            rate,
            rateSequenceNumber
        )

        if (!isRateValid) {
            console.log('❌ Rate validation failed')
            const latestRate = await withdrawService.rateService.getLatestRate()
            return res.status(409).json({
                success: false,
                error: 'Rate has changed',
                currentRate: latestRate, // adding currentRate for consistency with existing withdraw endpoint
            })
        }

        console.log('✅ Rate validation successful')

        // Step 2: Calculate amounts
        const grossUSDC = amountHUSD * rate
        const fee = grossUSDC * INSTANT_WITHDRAW_FEE
        const netUSDC = grossUSDC - fee

        console.log('💰 Amount calculations:', {
            amountHUSD,
            rate,
            grossUSDC,
            fee: `${fee} (${INSTANT_WITHDRAW_FEE * 100}%)`,
            netUSDC,
        })

        // Step 3: Check instant withdraw wallet USDC balance (not treasury)
        const instantWithdrawWalletId = process.env.INSTANT_WITHDRAW_WALLET_ID
        const usdcTokenId = process.env.USDC_TOKEN_ID
        
        if (!instantWithdrawWalletId || !usdcTokenId) {
            return res.status(500).json({
                success: false,
                error: 'Missing required environment variables',
            })
        }
        
        const instantWithdrawUSDCBalance = await hederaService.checkBalance(
            instantWithdrawWalletId,
            usdcTokenId
        )

        console.log(
            `🏦 Instant Withdraw Wallet USDC balance: ${instantWithdrawUSDCBalance}, Required: ${netUSDC}`
        )

        if (instantWithdrawUSDCBalance < netUSDC) {
            console.log('❌ Insufficient instant withdraw wallet USDC balance')
            return res.status(400).json({
                success: false,
                error: 'Insufficient instant withdraw wallet USDC balance for withdrawal',
            })
        }

        // Step 4: Verify that user sent HUSD to emissions wallet (new flow)
        console.log(
            '🔍 Verifying HUSD transfer from user to emissions wallet...'
        )

        const emissionsWalletId = process.env.EMISSIONS_ID
        
        if (!emissionsWalletId) {
            return res.status(500).json({
                success: false,
                error: 'Missing emissions wallet configuration',
            })
        }

        // For instant withdrawals, we need to verify the HUSD was transferred very recently
        // We'll check for transfers in the last 10 minutes (increased from 5 for Mirror Node delays)
        const tenMinutesAgo = new Date(
            Date.now() - 10 * 60 * 1000
        ).toISOString()

        // IMPORTANT: For instant withdrawals, the user sends the full hUSD amount they want to withdraw
        // The user sends exactly amountHUSD, and receives netUSDC after fees
        const actualHUSDToVerify = amountHUSD

        console.log('💡 HUSD amount verification:', {
            requestedAmountHUSD: amountHUSD,
            grossUSDC: grossUSDC,
            fee: fee,
            netUSDC: netUSDC,
            actualHUSDToVerify: actualHUSDToVerify,
            note: 'User sends the full hUSD amount, receives netUSDC after fee',
        })

        const husdTransferVerified = await hederaService.verifyHUSDTransfer(
            userAccountId,
            emissionsWalletId,
            actualHUSDToVerify,
            tenMinutesAgo
        )

        if (!husdTransferVerified) {
            console.log(
                '❌ HUSD transfer verification failed after multiple attempts'
            )
            console.log(
                `📋 Expected ${actualHUSDToVerify.toFixed(
                    3
                )} hUSD from ${userAccountId} to ${emissionsWalletId}`
            )
            console.log(
                `💡 Note: User should send full hUSD amount (${actualHUSDToVerify.toFixed(
                    3
                )} hUSD) to get ${netUSDC.toFixed(6)} USDC after fees`
            )
            console.log(`⏰ Checked transactions since: ${tenMinutesAgo}`)
            return res.status(400).json({
                success: false,
                error: `HUSD transfer verification failed after multiple attempts. This could be due to: 1) You haven't sent the required ${actualHUSDToVerify.toFixed(
                    3
                )} hUSD to the emissions wallet, 2) The transfer was sent more than 10 minutes ago, or 3) Mirror node synchronization delay. Please ensure you have sent the correct amount and try again in a few moments if the transfer was just completed.`,
            })
        }

        console.log('✅ HUSD transfer verified')

        // Step 5: Verify user has USDC token associated
        console.log('🔍 Verifying user has USDC token associated...')
        
        try {
            const userTokensUrl = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${userAccountId}/tokens`
            const userTokensResponse = await fetch(userTokensUrl)
            
            if (userTokensResponse.ok) {
                const userTokensData = await userTokensResponse.json()
                const hasUSDCAssociated = userTokensData.tokens?.some((token: any) => 
                    token.token_id === usdcTokenId && !token.deleted
                )
                
                if (!hasUSDCAssociated) {
                    console.log('❌ User does not have USDC token associated')
                    return res.status(400).json({
                        success: false,
                        error: `Token association required: You must associate the USDC token (${usdcTokenId}) to your account to receive withdrawals. Please open your wallet, go to token associations, and add this token ID: ${usdcTokenId}`,
                    })
                }
                
                console.log('✅ User has USDC token associated')
            } else {
                console.warn('⚠️ Could not verify token association, proceeding anyway')
            }
        } catch (associationError) {
            console.warn('⚠️ Error checking token association:', associationError)
            // Continue anyway - let the transaction fail with proper error if needed
        }

        // Step 6: Execute atomic USDC transfer to user
        console.log('🚀 Executing instant USDC transfer...')

        const instantWithdrawWalletKey = process.env.INSTANT_WITHDRAW_WALLET_KEY
        
        if (!instantWithdrawWalletKey) {
            return res.status(500).json({
                success: false,
                error: 'Missing instant withdraw wallet key configuration',
            })
        }

        // Setup Hedera client
        console.log('🔧 Setting up Hedera client with Instant Withdraw Wallet...')
        console.log(`   Wallet ID: ${instantWithdrawWalletId}`)
        console.log(`   USDC Token: ${usdcTokenId}`)
        
        const client = Client.forTestnet()
        client.setOperator(
            AccountId.fromString(instantWithdrawWalletId),
            PrivateKey.fromString(instantWithdrawWalletKey)
        )

        console.log('✅ Instant Withdraw client configured')
        console.log(`   Operator Account: ${client.operatorAccountId?.toString()}`)
        console.log(`   Operator Key: ${client.operatorPublicKey?.toString()}`)

        // Create atomic transfer transaction
        const USDC_MULTIPLIER = Math.pow(10, 6) // USDC has 6 decimals
        console.log('🔧 Creating transfer transaction with:')
        console.log(`   Token ID: ${usdcTokenId}`)
        console.log(`   From: ${instantWithdrawWalletId} (amount: -${Math.floor(netUSDC * USDC_MULTIPLIER)})`)
        console.log(`   To: ${userAccountId} (amount: +${Math.floor(netUSDC * USDC_MULTIPLIER)})`)
        console.log(`   Net USDC: ${netUSDC}`)
        
        const transferTx = new TransferTransaction()
            .addTokenTransfer(
                TokenId.fromString(usdcTokenId),
                AccountId.fromString(instantWithdrawWalletId),
                -Math.floor(netUSDC * USDC_MULTIPLIER) // Convert to USDC minimum units (6 decimals)
            )
            .addTokenTransfer(
                TokenId.fromString(usdcTokenId),
                AccountId.fromString(userAccountId),
                Math.floor(netUSDC * USDC_MULTIPLIER) // Convert to USDC minimum units (6 decimals)
            )
            .setTransactionMemo(
                `Instant withdrawal: ${amountHUSD} hUSD -> ${netUSDC} USDC`
            )

        // Execute transaction
        console.log('⚡ Executing transfer transaction...')
        console.log(`   From: ${instantWithdrawWalletId} (${-netUSDC} USDC)`)
        console.log(`   To: ${userAccountId} (+${netUSDC} USDC)`)
        console.log(`   Amount in minimum units: ${Math.floor(netUSDC * USDC_MULTIPLIER)}`)
        
        const txResponse = await transferTx.execute(client)
        const receipt = await txResponse.getReceipt(client)

        console.log(`📋 Transaction receipt status: ${receipt.status.toString()}`)

        if (receipt.status.toString() !== 'SUCCESS') {
            console.error(`❌ Transaction failed with status: ${receipt.status}`)
            throw new Error(`Transaction failed with status: ${receipt.status}`)
        }

        const txId = txResponse.transactionId?.toString()
        console.log('✅ Instant USDC transfer completed:', txId)

        // Step 7: Publish instant withdrawal result to HCS
        console.log('📝 Publishing instant withdrawal result to HCS...')

        try {
            const requestId = `instant_withdraw_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`

            const instantWithdrawMessage = {
                type: 'instant_withdraw_result',
                requestId,
                user: userAccountId,
                amountHUSD,
                grossUSDC,
                fee,
                netUSDC,
                rate,
                rateSequenceNumber,
                txId,
                status: 'completed',
                processedAt: new Date().toISOString(),
            }

            // Publish to HCS topic using the same pattern as publishWithdrawResult
            const withdrawTopicId = process.env.WITHDRAW_TOPIC_ID!

            const response = await new TopicMessageSubmitTransaction()
                .setTopicId(TopicId.fromString(withdrawTopicId))
                .setMessage(JSON.stringify(instantWithdrawMessage))
                .execute(client)

            const hcsReceipt = await response.getReceipt(client)

            if (hcsReceipt.status.toString() !== 'SUCCESS') {
                console.warn(
                    '⚠️ Failed to publish to HCS:',
                    hcsReceipt.status.toString()
                )
            } else {
                console.log('✅ Instant withdrawal result published to HCS')
            }
        } catch (publishError) {
            console.warn(
                '⚠️ Failed to publish to HCS (transaction still succeeded):',
                publishError
            )
            // Don't fail the request if HCS publishing fails - the transaction already succeeded
        }

        console.log('🎉 Instant withdrawal completed successfully!')

        return res.status(200).json({
            success: true,
            txId,
            grossUSDC,
            fee,
            netUSDC,
        })
    } catch (error) {
        console.error('❌ [INSTANT WITHDRAW] ERROR:', error)
        console.error('❌ [INSTANT WITHDRAW] Error name:', error instanceof Error ? error.name : 'Unknown')
        console.error('❌ [INSTANT WITHDRAW] Error message:', error instanceof Error ? error.message : String(error))
        console.error('❌ [INSTANT WITHDRAW] Error stack:', error instanceof Error ? error.stack : 'No stack')
        
        // Handle specific Hedera errors
        let errorMessage = 'Instant withdrawal failed'
        
        if (error instanceof Error) {
            if (error.message.includes('TOKEN_NOT_ASSOCIATED_TO_ACCOUNT')) {
                errorMessage = `You must associate the USDC token (${process.env.USDC_TOKEN_ID}) to your account before receiving withdrawals. Please associate the token in your wallet and try again.`
            } else if (error.message.includes('INSUFFICIENT_TOKEN_BALANCE')) {
                errorMessage = 'Insufficient token balance for withdrawal'
            } else if (error.message.includes('INSUFFICIENT_ACCOUNT_BALANCE')) {
                errorMessage = 'Insufficient HBAR balance to pay transaction fees'
            } else {
                errorMessage = `Instant withdrawal failed: ${error.message}`
            }
        }
    }
}
