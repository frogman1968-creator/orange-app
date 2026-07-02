"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) redirect("/signup?error=" + encodeURIComponent(error.message))
  if (data.user) redirect("/onboarding/workspace")
  redirect("/signup?error=Something+went+wrong")
}