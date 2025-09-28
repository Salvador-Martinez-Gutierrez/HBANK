import Image from "next/image"

export function TestnetUsdcFaucet() {
  const faucetUrl = "https://faucet.circle.com/?_gl=1*flvpq9*_gcl_au*MzgzMDE3NjQxLjE3NTYwMzA1Njk.*_ga*MTQ0MjY3OTEyOS4xNzU2MDMwNTY5*_ga_GJDVPCQNRV*czE3NTYwMzA1NjkkbzEkZzEkdDE3NTYwMzA1NjkkajYwJGwwJGgw"

  return (
    <div className="mb-8 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
      <Image src="/usdc.svg" alt="USDC" width={20} height={20} className="rounded-full inline-block mx-2" />
      Get Free Testnet USDC Tokens from {` `}
      <a
        href={faucetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-amber-800 hover:text-blue-500 underline"
      >
        Circle&apos;s Official Faucet
      </a>
    </div>
  )
}
