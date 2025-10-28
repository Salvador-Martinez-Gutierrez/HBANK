/**
 * NFT Gallery Tab Component
 *
 * Displays NFTs in a responsive grid layout with images and metadata.
 */

import { ImageIcon } from 'lucide-react'
import type { NFTDisplay } from '@/features/portfolio/types/portfolio-display'

interface NftGalleryTabProps {
    nfts: NFTDisplay[]
}

export function NftGalleryTab({ nfts }: NftGalleryTabProps) {
    const nftCount = nfts?.length || 0

    if (nftCount === 0) {
        return (
            <div className='text-center py-6 text-muted-foreground'>
                <ImageIcon className='w-12 h-12 mx-auto mb-2 opacity-50' />
                <p>No NFTs found</p>
            </div>
        )
    }

    return (
        <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
            {nfts.map((nft) => (
                <NftCard key={nft.id} nft={nft} />
            ))}
        </div>
    )
}

interface NftCardProps {
    nft: NFTDisplay
}

function NftCard({ nft }: NftCardProps) {
    const nftMeta = (nft.metadata ?? {}) as Record<string, unknown>
    const nftImage =
        nft.token_icon ??
        (nftMeta.image ? String(nftMeta.image) : null) ??
        null
    const nftName =
        nft.token_name ??
        (nftMeta.name ? String(nftMeta.name) : null) ??
        `NFT #${nft.serial_number}`

    return (
        <div className='group relative rounded-lg overflow-hidden bg-muted/50 hover:bg-muted transition-all border border-border/50 hover:border-border'>
            {nftImage ? (
                <div className='aspect-square relative'>
                    <img
                        src={nftImage}
                        alt={nftName}
                        className='w-full h-full object-cover'
                        onError={(e) => {
                            e.currentTarget.src = ''
                            e.currentTarget.className =
                                'w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20'
                        }}
                    />
                </div>
            ) : (
                <div className='aspect-square bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center'>
                    <ImageIcon className='w-12 h-12 text-muted-foreground/50' />
                </div>
            )}
            <div className='p-3'>
                <div className='font-medium text-sm truncate'>{nftName}</div>
                <div className='text-xs text-muted-foreground'>
                    #{nft.serial_number}
                </div>
            </div>
        </div>
    )
}
