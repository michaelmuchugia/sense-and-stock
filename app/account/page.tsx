import { redirect } from 'next/navigation'
import { auth, currentUser } from '@clerk/nextjs/server'
import { ensureUser } from '@/lib/auth/ensure-user'
import { getUserById, listUserActivity } from '@/lib/db/queries/users'
import { AccountClient, type AccountTab } from '@/components/account/AccountClient'

export const dynamic = 'force-dynamic'

const VALID_TABS: AccountTab[] = ['profile', 'sessions', 'activity', 'danger']

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function AccountPage({ searchParams }: PageProps) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in?redirect_url=/account')

  await ensureUser()
  const [clerkUser, dbUser, activity] = await Promise.all([
    currentUser(),
    getUserById(userId),
    listUserActivity(userId, 100),
  ])

  const { tab } = await searchParams
  const initialTab: AccountTab = VALID_TABS.includes(tab as AccountTab) ? (tab as AccountTab) : 'profile'

  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    ''
  const name = dbUser?.name ?? clerkUser?.fullName ?? ''
  const phone = dbUser?.phone ?? ''

  return (
    <div className="C pb40" style={{ paddingTop: 32 }}>
      <div className="shdr" style={{ paddingTop: 0, borderBottom: 'none' }}>
        <div className="sht">Your Account</div>
      </div>
      <AccountClient
        initialTab={initialTab}
        email={email}
        name={name}
        phone={phone}
        activity={activity}
      />
    </div>
  )
}
