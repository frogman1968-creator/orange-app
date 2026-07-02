import { signup } from "./actions"

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-[#6B46C1] text-center mb-2">PARLOR</h1>
        <p className="text-sm text-gray-500 text-center mb-8">One workspace. Built for agencies.</p>
        {error && (
          <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <form action={signup} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email address</label>
            <input name="email" type="email" required placeholder="you@agency.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 bg-white" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input name="password" type="password" required placeholder="At least 8 characters"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 bg-white" />
          </div>
          <button type="submit" className="w-full bg-[#6B46C1] text-white rounded-lg px-4 py-3 text-sm font-semibold">
            Create Account
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">Already have an account? <a href="/login" className="text-[#6B46C1] font-medium">Log in</a></p>
      </div>
    </div>
  )
}
