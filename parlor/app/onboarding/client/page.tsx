import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function FirstClientPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8">
        <div className="text-center mb-2">
          <h1 className="text-3xl font-bold text-[#6B46C1]">PARLOR</h1>
        </div>

        <div className="flex justify-center gap-2 mb-8 mt-4">
          <div className="h-1 w-8 rounded-full bg-[#6B46C1]"/>
          <div className="h-1 w-8 rounded-full bg-[#6B46C1]"/>
          <div className="h-1 w-8 rounded-full bg-[#6B46C1]"/>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-1">Add your first client</h2>
        <p className="text-sm text-gray-500 mb-6">A channel will be created automatically.</p>

        <form action={createFirstClient} className="space-y-4">
          <input name="name" type="text" placeholder="Client name" required autoFocus
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#6B46C1] focus:border-transparent"/>
          <input name="contact_email" type="email" placeholder="Contact email (optional)"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#6B46C1] focus:border-transparent"/>
          <button type="submit"
            className="w-full bg-[#6B46C1] text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-[#5B3AA8] transition">
            Create Client
          </button>
        </form>
      </div>
    </div>
  )
}

async function createFirstClient(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  if (!profile?.workspace_id) redirect('/onboarding/workspace')

  await supabase.from('clients').insert({
    workspace_id: profile.workspace_id,
    name: formData.get('name') as string,
    contact_email: (formData.get('contact_email') as string) || null,
  })

  redirect('/home')
}
