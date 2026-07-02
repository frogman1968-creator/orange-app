import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Sidebar from '@/components/Sidebar'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, workspaces(*)')
    .eq('id', user.id)
    .single()

  if (!profile?.workspace_id) redirect('/onboarding/workspace')

  const { data: clients } = await supabase
    .from('clients')
    .select('*, projects(*)')
    .eq('workspace_id', profile.workspace_id)
    .order('name')

  const { data: channels } = await supabase
    .from('channels')
    .select('*')
    .eq('workspace_id', profile.workspace_id)
    .eq('is_default', true)

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, projects(name, clients(name)), task_assignees(user_id)')
    .eq('workspace_id', profile.workspace_id)
    .neq('status', 'done')
    .order('due_date', { ascending: true })

  const today = new Date().toISOString().split('T')[0]
  const pastDue = tasks?.filter(t => t.due_date && t.due_date < today) || []
  const dueToday = tasks?.filter(t => t.due_date === today) || []
  const inProgress = tasks?.filter(t => t.status === 'in_progress' && (!t.due_date || t.due_date > today)) || []

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar profile={profile} clients={clients || []} defaultChannels={channels || []} />
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-4xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Home</h1>
          <p className="text-gray-400 text-sm mb-8">Here's what needs your attention.</p>

          {pastDue.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs font-bold text-red-500 tracking-wider mb-3">PAST DUE</h2>
              <div className="space-y-2">
                {pastDue.map(task => (
                  <TaskCard key={task.id} task={task} color="red" />
                ))}
              </div>
            </section>
          )}

          {dueToday.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs font-bold text-orange-500 tracking-wider mb-3">DUE TODAY</h2>
              <div className="space-y-2">
                {dueToday.map(task => (
                  <TaskCard key={task.id} task={task} color="orange" />
                ))}
              </div>
            </section>
          )}

          {inProgress.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs font-bold text-gray-400 tracking-wider mb-3">IN PROGRESS</h2>
              <div className="space-y-2">
                {inProgress.map(task => (
                  <TaskCard key={task.id} task={task} color="gray" />
                ))}
              </div>
            </section>
          )}

          {pastDue.length === 0 && dueToday.length === 0 && inProgress.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-400 text-sm">No urgent tasks. You're clear.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function TaskCard({ task, color }: { task: any, color: string }) {
  const borderColor = color === 'red' ? 'border-red-200' : color === 'orange' ? 'border-orange-200' : 'border-gray-200'
  const dotColor = color === 'red' ? 'bg-red-400' : color === 'orange' ? 'bg-orange-400' : 'bg-gray-300'

  return (
    <div className={`bg-white rounded-lg border ${borderColor} px-4 py-3 flex items-center gap-3`}>
      <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`}/>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
        <p className="text-xs text-gray-400">{task.projects?.clients?.name} · {task.projects?.name}</p>
      </div>
      {task.due_date && (
        <span className="text-xs text-gray-400 shrink-0">{task.due_date}</span>
      )}
    </div>
  )
}
