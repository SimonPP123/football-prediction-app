import { redirect } from 'next/navigation'

export default function AdminPage() {
  // Redirect to users management
  redirect('/admin/users')
}
