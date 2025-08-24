import { socialLinks } from '@/lib/navigation-config'
import Link from 'next/link'

export function SocialLinksSection() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">
        Socials
      </h3>
      <div className="flex space-x-3">
        {socialLinks.map((link) => (
          <Link key={link.name} target="_blank" href={link.href}>
            {link.icon}
          </Link>
        ))}
      </div>
    </div>
  )
}
