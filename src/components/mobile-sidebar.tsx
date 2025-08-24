'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { navigation } from '@/lib/navigation-config'
import { LogoSection } from './ui/logo-section'
import { SocialLinksSection } from './ui/social-links-section'
import { ResourceLinksSection } from './ui/resource-links-section'

export function MobileSidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
        >
          <Menu/>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 border-r-blue-500">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation Menu</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-full bg-background">
          {/* Logo */}
          <LogoSection className="flex items-center flex-shrink-0 px-6" />

          {/* Navigation */}
          <nav className="flex-1 flex flex-col px-4 py-4 space-y-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-blue-400 text-white'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {React.createElement(item.icon, {
                    className: cn(
                      'mr-3 h-6 w-6 flex-shrink-0',
                      isActive ? 'text-white' : 'text-muted-foreground group-hover:text-accent-foreground'
                    )
                  })}
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Footer sections */}
          <div className="flex-shrink-0 px-4 pb-6 space-y-6 pt-6">
            <SocialLinksSection   />
            <ResourceLinksSection />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
