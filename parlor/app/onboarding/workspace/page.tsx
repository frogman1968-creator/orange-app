import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function WorkspaceSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8">
        <div className="text-center mb-2">
          <h1 className="text-3xl font-bold text-[#6B46C1]">PARLOR</h1>
        </div>

        <div className="flex justify-center gap-2 mb-8 mt-4">
          <div className="h-1 w-8 rounded-full bg-[#6B46C1]"/>
          <div className="h-1 w-8 rounded-full bg-gray-200"/>
          <div className="h-1 w-8 rounded-full bg-gray-200"/>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-1">What's your agency called?</h2>
        <p className="text-sm text-gray-500 mb-6">This becomes your Parlor workspace.</p>

        {error && (
          <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form action={createWorkspace} className="space-y-4">
          <input name="name" type="text" placeholder="Agency name" required autoFocus
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#6B46C1] focus:border-transparent"/>
          <select name="agency_type"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#6B46C1] focus:border-transparent">
            <option value="">What do you do?</option>
            <option value="design">Design</option>
            <option value="marketing">Marketing</option>
            <option value="development">Development</option>
            <option value="consulting">Consulting</option>
            <option value="other">Other</option>
          </select>
          <button type="submit"
            className="w-full bg-[#6B46C1] text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-[#5B3AA8] transition">
            Create Workspace
          </button>
        </form>
      </div>
    </div>
  )
}

async function createWorkspace(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = formData.get('name') as string
  const agency_type = formData.get('agency_type') as string
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

  // Generate the id ourselves and skip .select() on the insert. Chaining
  // .select() after .insert() makes Postgres apply the table's SELECT RLS
  // policy to the RETURNING row, but that policy (id = get_my_workspace_id())
  // can never pass for a workspace that doesn't exist yet on the user's
  // profile — a chicken-and-egg RLS failure. Knowing the id up front avoids
  // needing RETURNING at all.
  const workspaceId = crypto.randomUUID()

  const { error } = await supabase
    .from('workspaces')
    .insert({ id: workspaceId, name, slug, agency_type })

  if (error) {
    const msg = error.message || 'Failed to create workspace'
    redirect('/onboarding/workspace?error=' + encodeURIComponent(msg))
  }

  await supabase
    .from('profiles')
    .update({ workspace_id: workspaceId, role: 'owner' })
    .eq('id', user.id)

  redirect('/onboarding/invite')
}
