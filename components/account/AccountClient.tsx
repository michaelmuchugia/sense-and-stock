'use client'

import { useSearchParams } from 'next/navigation'
import { ProfileForm } from './ProfileForm'
import { SessionsClient } from './SessionsClient'
import { ActivityPanel } from './ActivityPanel'
import { DeleteAccountDialog } from './DeleteAccountDialog'
import type { ActivityEntry } from '@/lib/types/user'

export type AccountTab = 'profile' | 'sessions' | 'activity' | 'danger'

const VALID_TABS: AccountTab[] = ['profile', 'sessions', 'activity', 'danger']

interface AccountClientProps {
  initialTab: AccountTab
  email: string
  name: string
  phone: string
  activity: ActivityEntry[]
}

/**
 * The account sections are no longer selected by an inline tab bar. Navigation
 * lives in the top-right user menu (UserMenu), whose links point at
 * /account?tab=<section>. We derive the active section reactively from the URL
 * so navigating from that menu switches the panel without a full reload.
 */
export function AccountClient({ initialTab, email, name, phone, activity }: AccountClientProps) {
  const params = useSearchParams()
  const raw = params.get('tab') as AccountTab | null
  const tab: AccountTab = raw && VALID_TABS.includes(raw) ? raw : initialTab

  return (
    <div className="acct-section">
      {tab === 'profile' && <ProfileForm initialName={name} initialPhone={phone} email={email} />}
      {tab === 'sessions' && <SessionsClient />}
      {tab === 'activity' && <ActivityPanel rows={activity} />}
      {tab === 'danger' && <DeleteAccountDialog email={email} />}
    </div>
  )
}
