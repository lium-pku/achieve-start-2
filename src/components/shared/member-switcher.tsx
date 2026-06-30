'use client'

import { useState } from 'react'
import { Member, ROLE_LABEL } from '@/lib/types'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Check } from 'lucide-react'

interface Props {
  members: Member[]
  currentMember: Member
  onChange: (m: Member) => void
}

export function MemberSwitcher({ members, currentMember, onChange }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-2 py-1.5 rounded-full bg-card border border-border hover:bg-muted transition-colors">
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-base"
            style={{ background: currentMember.color + '22' }}
          >
            {currentMember.avatar}
          </span>
          <span className="text-sm font-medium max-w-[60px] truncate">
            {currentMember.name}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs">切换角色</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {members.map((m) => (
          <DropdownMenuItem
            key={m.id}
            onClick={() => {
              onChange(m)
              setOpen(false)
            }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-base"
              style={{ background: m.color + '22' }}
            >
              {m.avatar}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{m.name}</div>
              <div className="text-[10px] text-muted-foreground">{ROLE_LABEL[m.role]}</div>
            </div>
            {m.id === currentMember.id && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
