import Image from "next/image"

export function TestnetUsdcFaucet() {
  const faucetUrl = "https://faucet.circle.com/?_gl=1*flvpq9*_gcl_au*MzgzMDE3NjQxLjE3NTYwMzA1Njk.*_ga*MTQ0MjY3OTEyOS4xNzU2MDMwNTY5*_ga_GJDVPCQNRV*czE3NTYwMzA1NjkkbzEkZzEkdDE3NTYwMzA1NjkkajYwJGwwJGgw"
  const hbarFaucetUrl = "https://portal.hedera.com/faucet"

  return (
    <>
      <div className="mb-4 rounded-md border border-purple-300 bg-purple-50 p-3 text-sm text-purple-800">
        <Image src="/hedera-hbar-logo.svg" alt="HBAR" width={20} height={20} className="inline-block mx-2" />
        Get Free Testnet HBAR from the {` `}
        <a
          href={hbarFaucetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-purple-800 hover:text-blue-500 underline"
        >
          Official Hedera Faucet
        </a>
      </div>
      <div className="mb-8 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
        <Image src="/usdc.svg" alt="USDC" width={20} height={20} className="rounded-full inline-block mx-2" />
        Get Free Testnet USDC Tokens from the {` `}
        <a
          href={faucetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-amber-800 hover:text-blue-500 underline"
        >
          Official Circle Faucet
        </a>
        . Associate USDC Token Id: 0.0.429274
      </div>
    </>
  )
}
