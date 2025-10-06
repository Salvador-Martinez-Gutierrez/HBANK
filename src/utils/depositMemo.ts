import { randomBytes } from 'crypto'

const MAX_MEMO_LENGTH = 96

export const createDepositMemo = (params: {
    userAccountId: string
    husdAmount: number
    rateSequenceNumber: string
}) => {
    const timestampSegment = Date.now().toString(36)
    const randomSegment = randomBytes(4).toString('base64url')
    const userSuffix =
        params.userAccountId.split('.').pop() ?? params.userAccountId
    const amountSegment = params.husdAmount.toFixed(2)
    const memo = `DEP:${timestampSegment}:${randomSegment}:${userSuffix}:${params.rateSequenceNumber}:${amountSegment}`

    return memo.length <= MAX_MEMO_LENGTH
        ? memo
        : memo.slice(0, MAX_MEMO_LENGTH)
}
