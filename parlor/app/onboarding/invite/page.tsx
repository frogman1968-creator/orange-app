import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function InviteTeamPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8">
        <div className="text-center mb-2">
          <h1 className="text-3xl font-bold text-[#6B46C1]">PARLOR</h1>
        </div>

        <div className="flex justify-center gap-2 mb-8 mt-4">
          <div className="h-1 w-8 rounded-full bg-[#6B46C1]"/>
          <div className="h-1 w-8 rounded-full bg-[#6B46C1]"/>
          <div className="h-1 w-8 rounded-full bg-gray-200"/>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-1">Who do you work with?</h2>
        <p className="text-sm text-gray-500 mb-6">Invite your team. You can always do this later.</p>

        <form action={sendInvites} className="space-y-4">
          <input name="emails" type="text" placeholder="email@agency.com, another@agency.com"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#6B46C1] focus:border-transparent"/>
          <button type="submit"
            className="w-full bg-[#6B46C1] text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-[#5B3AA8] transition">
            Send Invites and Continue
          </button>
        </form>

        <form action={skip}>
          <button type="submit" className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-4 transition">
            Skip for now
          </button>
        </form>
      </div>
    </div>
  )
}

async function sendInvites(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const emailsRaw = formData.get('emails') as string
  if (emailsRaw?.trim()) {
    const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', user.id).single()
    if (profile?.workspace_id) {
      const emails = emailsRaw.split(',').map(e => e.trim()).filter(Boolean)
      for (const email of emails) {
        await supabase.from('invites').insert({ workspace_id: profile.workspace_id, email, invited_by: user.id })
      }
    }
  }
  redirect('/onboarding/client')
}

async function skip() {
  'use server'
  redirect('/onboarding/client')
}
