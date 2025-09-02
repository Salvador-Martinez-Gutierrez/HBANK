import {
    Eye,
    FileText,
    GithubIcon,
    PieChart,
    CircleDollarSign,
    ArrowDownLeft,
} from 'lucide-react'

export const navigation = [
    { name: 'hUSD', href: '/vault', icon: CircleDollarSign },
    { name: 'Withdraw', href: '/withdraw', icon: ArrowDownLeft },
    { name: 'Portfolio', href: '/portfolio', icon: PieChart },
    { name: 'Transparency', href: '/transparency', icon: Eye },
]

export const socialLinks = [
    {
        name: 'X',
        href: 'https://x.com/ValoraProtocol',
        icon: (
            <svg viewBox='0 0 24 24' aria-hidden='true' className='h-6 w-6'>
                <g>
                    <path
                        fill='currentColor'
                        d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'
                    />
                </g>
            </svg>
        ),
    },
]

export const resourceLinks = [
    { name: 'Docs', href: '#', icon: <FileText className='h-6 w-6' /> },
    { name: 'GitHub', href: '#', icon: <GithubIcon className='h-6 w-6' /> },
]
