import Image from 'next/image'

interface LogoSectionProps {
  className?: string
}

export function LogoSection({ 
  className = "flex items-center px-6"
}: LogoSectionProps) {
  return (
    <div className={className}>
      <Image
        src="/hbank-logo.png"
        alt="HBANK"
        width={164}
        height={60}
      />
    </div>
  )
}
