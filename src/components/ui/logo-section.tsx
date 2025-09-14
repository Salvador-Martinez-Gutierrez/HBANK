import Image from 'next/image'
import Link from 'next/link'
import { useTheme } from '@/components/theme-provider'

interface LogoSectionProps {
  className?: string
}

export function LogoSection({
  className = "flex items-center px-6"
}: LogoSectionProps) {
  const { theme } = useTheme();
  // If the theme is light, use the negative logo; otherwise, use the normal one
  const logoSrc = theme === 'light' ? '/hbank-logo.png' : '/hbank-logo-dark.png';
  return (
    <div className={className}>
      <Link href="/">
        <Image
          src={logoSrc}
          alt="Hbank Protocol"
          width={164}
          height={60}
          className="object-contain cursor-pointer"
        />
      </Link>
    </div>
  )
}
