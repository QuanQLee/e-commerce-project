import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: any, info: any) { console.error('ErrorBoundary', error, info) }
  render() {
    if (this.state.hasError) {
      return <div style={{ padding: 24 }}>Something went wrong.</div>
    }
    return this.props.children
  }
}

