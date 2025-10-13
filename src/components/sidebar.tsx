'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { navigation } from '@/lib/navigation-config'
import { ResourceLinksSection } from './ui/resource-links-section'
import { SocialLinksSection } from './ui/social-links-section'
import { LogoSection } from './ui/logo-section'
import { Badge } from './ui/badge'

export function Sidebar() {
  const pathname = usePathname()
  // TODO: This value will come from the API
  const vyusdPercentage = 13.33

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex flex-col flex-grow bg-background border-r border-blue-500">
        {/* Logo */}
        <LogoSection />

        {/* Navigation */}
        <nav className="flex-1 flex flex-col px-4 py-4 space-y-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const isDisabled = item.name === 'Swap' || item.name === 'Spend'
            
            const content = (
              <>
                <item.icon
                  className={cn(
                    'mr-2 h-6 w-6 flex-shrink-0',
                    isActive ? 'text-white' : 'text-foreground group-hover:text-accent-foreground'
                  )}
                />
                <div className="flex items-center justify-between gap-2 flex-1">
                  {item.name}
                  {item.name === 'Earn' && (
                    <Badge 
                      variant="default" 
                      className="bg-blue-300 text-white border-blue-400"
                    >
                      {vyusdPercentage}%
                    </Badge>
                  )}
                  {(item.name === 'Swap' || item.name === 'Spend') && (
                    <Badge 
                      variant="default" 
                      className="bg-blue-300 text-white border-blue-400"
                    >
                      soon
                    </Badge>
                  )}
                </div>
              </>
            )
            
            if (isDisabled) {
              return (
                <div
                  key={item.name}
                  className={cn(
                    'group flex items-center px-3 py-3.5 text-md font-medium rounded-lg transition-colors cursor-not-allowed opacity-60',
                    'text-foreground'
                  )}
                >
                  {content}
                </div>
              )
            }
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center px-3 py-3.5 text-md font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-blue-400 text-white'
                    : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {content}
              </Link>
            )
          })}
        </nav>

        {/* Footer sections */}
        <div className="flex-shrink-0 px-4 pb-6 space-y-4">
          <SocialLinksSection />
          <ResourceLinksSection />
        </div>
      </div>
    </div>
  )
}
