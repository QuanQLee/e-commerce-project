import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Loading from './Loading'
import { isSessionAuthenticated, restorePersistedSession } from '../auth'

export default function ProtectedRoute() {
  const location = useLocation()
  const [ready, setReady] = useState(false)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    restorePersistedSession()
    setAuthed(isSessionAuthenticated())
    setReady(true)
  }, [])

  if (!ready) {
    return <Loading lines={1} />
  }

  if (!authed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
