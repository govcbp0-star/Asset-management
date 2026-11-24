import { Link } from 'react-router-dom'

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link className={`brand${inverse ? ' brand-inverse' : ''}`} to="/" aria-label="Aurelius Registry home">
      <span className="brand-mark" aria-hidden="true">A</span>
      <span className="brand-wordmark"><strong>AURELIUS</strong><small>PRIVATE REGISTRY</small></span>
    </Link>
  )
}
