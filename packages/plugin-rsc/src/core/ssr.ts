import type { ServerConsumerManifest } from '../types'
import { memoize } from '../utils/shared'
import { removeReferenceCacheTag, setInternalRequire } from './shared'

let init = false

export function setRequireModule(options: {
  load: (id: string) => unknown
  /**
   * Called every time a module is requested, with the memoized result of `load`
   * @experimental
   */
  onRequire?: (id: string, result: unknown) => void
}): void {
  if (init) return
  init = true

  const requireModule = memoize((id: string) => {
    return options.load(removeReferenceCacheTag(id))
  })
  ;(globalThis as any).__vite_rsc_client_require__ = (id: string) => {
    const result = requireModule(id)
    options.onRequire?.(removeReferenceCacheTag(id), result)
    return result
  }

  setInternalRequire()
}

export function createServerConsumerManifest(): ServerConsumerManifest {
  return {}
}
