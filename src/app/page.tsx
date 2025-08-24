import { redirect } from 'next/navigation'

export default function Home() {
  // Redirect to vault as the default route
  redirect('/vault')
}
