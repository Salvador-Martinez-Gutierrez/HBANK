/**
 * ⚠️ DEPRECATED ENDPOINT - DO NOT USE
 *
 * This endpoint has been deprecated due to security vulnerabilities:
 * 1. Did not verify signatures properly
 * 2. Exposed predictable credentials
 * 3. Allowed authentication bypass
 *
 * Use the secure authentication flow instead:
 * - GET /api/auth/nonce - Get a nonce to sign
 * - POST /api/auth/verify - Verify signature and get JWT
 *
 * This file is kept temporarily to prevent breaking changes.
 * It will be removed in the next major version.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest): Promise<NextResponse> {
    return NextResponse.json(
        {
            success: false,
            error: 'This endpoint has been deprecated for security reasons',
            message: 'Please use /api/auth/nonce and /api/auth/verify instead',
            documentation: 'See /pages/api/auth/README.md for details',
        },
        { status: 410 }
    )
}

export async function POST(_req: NextRequest): Promise<NextResponse> {
    return NextResponse.json(
        {
            success: false,
            error: 'This endpoint has been deprecated for security reasons',
            message: 'Please use /api/auth/nonce and /api/auth/verify instead',
            documentation: 'See /pages/api/auth/README.md for details',
        },
        { status: 410 }
    )
}
