'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Profile = {
  full_name?: string
  email: string
  role: string
  workspaces?: { name: string }
}
type Project = { id: string; name: string }
type Client = { id: string; name: string; projects: Project[] }
type Channel = { id: string; name: string; type: string }

export default function Sidebar({ profile, clients, defaultChannels }: {
  profile: Profile
  clients: Client[]
  defaultChannels: Channel[]
}) {
  const pathname = usePathname()
  const workspaceName = (profile as any).workspaces?.name || 'My Workspace'

  return (
    <aside className="w-60 bg-[#1E1535] text-white flex flex-col h-screen overflow-y-auto shrink-0">
      <div className="px-4 py-4 border-b border-white/10">
        <div className="text-xs font-bold text-[#A78BFA] tracking-widest mb-1">PARLOR</div>
        <div className="text-sm font-semibold text-white truncate">{workspaceName}</div>
      </div>

      <nav className="px-2 py-3 space-y-0.5">
        <NavItem href="/home" label="Home" active={pathname === '/home'} />
        <NavItem href="/my-tasks" label="My Tasks" active={pathname === '/my-tasks'} />
        <NavItem href="/time" label="Time" active={pathname === '/time'} />
      </nav>

      <div className="px-4 py-2 mt-1">
        <div className="text-[10px] font-bold text-white/30 tracking-widest mb-2">— CLIENTS —</div>
        {clients.length === 0 ? (
          <p className="text-xs text-white/30 px-2 py-1">No clients yet</p>
        ) : (
          clients.map(client => (
            <div key={client.id} className="mb-1">
              <Link href={`/clients/${client.id}`}
                className="block text-sm text-white/70 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition truncate font-medium">
                {client.name}
              </Link>
              {client.projects?.map(project => (
                <Link key={project.id} href={`/projects/${project.id}`}
                  className="block text-xs text-white/50 hover:text-white/80 pl-4 py-0.5 rounded hover:bg-white/10 transition truncate">
                  {project.name}
                </Link>
              ))}
            </div>
          ))
        )}
      </div>

      <div className="px-4 py-2 mt-2">
        <div className="text-[10px] font-bold text-white/30 tracking-widest mb-2">— MESSAGES —</div>
        {defaultChannels.map(ch => (
          <Link key={ch.id} href={`/channels/${ch.id}`}
            className={`block text-sm px-2 py-1 rounded transition truncate ${
              pathname === `/channels/${ch.id}`
                ? 'bg-[#6B46C1] text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}>
            # {ch.name}
          </Link>
        ))}
      </div>

      <div className="mt-auto px-4 py-4 border-t border-white/10">
        <Link href="/team" className="block text-xs text-white/40 hover:text-white/70 transition mb-1">Team</Link>
        <Link href="/settings" className="block text-xs text-white/40 hover:text-white/70 transition">Settings</Link>
        <div className="text-xs text-white/25 mt-2 truncate">{profile.email}</div>
      </div>
    </aside>
  )
}

function NavItem({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href}
      className={`block px-3 py-2 rounded-lg text-sm font-medium transition ${
        active ? 'bg-[#6B46C1] text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`}>
      {label}
    </Link>
  )
}
