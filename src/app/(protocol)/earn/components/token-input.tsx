import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Image from 'next/image'

interface TokenInputProps {
    label: string
    value: string
    onChange?: (value: string) => void
    readOnly?: boolean
    placeholder?: string
    tokenSymbol: string
    tokenIcon: string
    usdValue?: string
    balance?: string
    showBalance?: boolean
    isLoadingBalance?: boolean
}

export function TokenInput({
    label,
    value,
    onChange,
    readOnly = false,
    placeholder = '0.00',
    tokenSymbol,
    tokenIcon,
    usdValue,
    balance,
    showBalance = false,
    isLoadingBalance = false,
}: TokenInputProps) {
    return (
        <div className='space-y-2'>
            <Label className='text-sm text-muted-foreground'>{label}</Label>
            <div className='relative'>
                <Input
                    type='number'
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                    readOnly={readOnly}
                    className='text-2xl h-16 pr-24 bg-background/50 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]'
                />
                <div className='absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2'>
                    {tokenIcon.startsWith('/') ? (
                        (() => {
                            const [imagePath, filter] = tokenIcon.split('|')
                            const isGrey = filter === 'grey'
                            const isPurple = filter === 'purple'
                            return (
                                <Image
                                    src={imagePath}
                                    alt={`${tokenSymbol} icon`}
                                    width={24}
                                    height={24}
                                    className={`rounded-full ${
                                        isGrey ? 'grayscale' : ''
                                    }`}
                                    style={isPurple ? { filter: 'sepia(1) saturate(4) hue-rotate(240deg) brightness(0.9)' } : undefined}
                                />
                            )
                        })()
                    ) : (
                        <span className='text-2xl'>{tokenIcon}</span>
                    )}
                    <span className='font-medium'>{tokenSymbol}</span>
                </div>
            </div>
            <div className='flex justify-between items-center'>
                <div className='text-xs text-muted-foreground'>
                    {usdValue || '$0.0000'}
                </div>
                {showBalance && (
                    <div className='text-xs text-muted-foreground'>
                        {isLoadingBalance ? (
                            <span className='animate-pulse'>
                                Balance: Loading... {tokenSymbol}
                            </span>
                        ) : balance ? (
                            <span>
                                Balance: {balance} {tokenSymbol}
                            </span>
                        ) : (
                            <span>Balance: 0.00 {tokenSymbol}</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
