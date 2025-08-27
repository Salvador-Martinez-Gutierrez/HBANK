import Image from 'next/image'
import Link from 'next/link'
import { useTheme } from '@/components/theme-provider'

interface LogoSectionProps {
  className?: string
}

export function LogoSection({
  className = "flex flex-col items-center px-6 gap-2 mt-4"
}: LogoSectionProps) {
  const { theme } = useTheme();
  // Si el tema es claro, usar el logo negativo; si no, el normal
  const logoSrc = theme === 'light' ? '/valora_logo_no_bg_negative.png' : '/valora_logo_no_bg.png';
  return (
    <div className={className}>
      <Link href="/">
        <Image
          src={logoSrc}
          alt="Valora Protocol"
          width={120}
          height={60}
          className="object-contain cursor-pointer"
        />
      </Link>
      <span className="text-lg font-semibold text-foreground">
        Valora Protocol
      </span>
    </div>
  )
}
