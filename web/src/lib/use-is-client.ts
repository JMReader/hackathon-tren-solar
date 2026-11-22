import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false)
}

export { useIsClient }
