'use client'

import { useState } from 'react'
import { Member } from '@/lib/types'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { GoalsTab } from '@/components/planning/goals-tab'
import { ReviewTab } from '@/components/planning/review-tab'
import { CommentsTab } from '@/components/planning/comments-tab'
import { Target, BarChart3, MessageSquare } from 'lucide-react'

interface Props {
  currentMember: Member
  members: Member[]
  onPointsChanged: () => void
}

export function PlanningTab({ currentMember, members }: Props) {
  const [subTab, setSubTab] = useState('goals')

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-bold">规划</h2>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="goals" className="text-xs">
            <Target className="w-3.5 h-3.5 mr-1" /> 目标
          </TabsTrigger>
          <TabsTrigger value="review" className="text-xs">
            <BarChart3 className="w-3.5 h-3.5 mr-1" /> 复盘
          </TabsTrigger>
          <TabsTrigger value="comments" className="text-xs">
            <MessageSquare className="w-3.5 h-3.5 mr-1" /> 点评
          </TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="mt-3">
          <GoalsTab currentMember={currentMember} members={members} />
        </TabsContent>

        <TabsContent value="review" className="mt-3">
          <ReviewTab currentMember={currentMember} members={members} />
        </TabsContent>

        <TabsContent value="comments" className="mt-3">
          <CommentsTab currentMember={currentMember} members={members} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
