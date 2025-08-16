import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { Dashboard } from "@/components/dashboard"

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  // The middleware and OnboardingGuard handle authentication and onboarding redirects
  // If we reach here, user should be authenticated (middleware would have redirected otherwise)
  // OnboardingGuard will handle redirect to /onboarding if needed
  
  // Provide a default user if session is somehow missing (shouldn't happen due to middleware)
  const user = session?.user || { id: "", name: "", email: "" }

  return <Dashboard user={user} />
}
