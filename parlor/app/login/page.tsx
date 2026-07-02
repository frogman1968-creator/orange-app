import Link from 'next/link'
import { login, loginWithGoogle } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#6B46C1]">PARLOR</h1>
          <p className="text-gray-500 mt-1 text-sm">One workspace. Built for agencies.</p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form action={loginWithGoogle}>
          <button type="submit" className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/></svg>
            Continue with Google
          </button>
        </form>

        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-200"/>
          <span className="px-3 text-xs text-gray-400">or</span>
          <div className="flex-1 border-t border-gray-200"/>
        </div>

        <form className="space-y-4">
          <input name="email" type="email" placeholder="Email" required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#6B46C1] focus:border-transparent"/>
          <div className="relative">
            <input name="password" type="password" placeholder="Password" required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#6B46C1] focus:border-transparent"/>
          </div>
          <button formAction={login} type="submit"
            className="w-full bg-[#6B46C1] text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-[#5B3AA8] transition">
            Log In
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link href="/signup" className="text-[#6B46C1] font-medium hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
