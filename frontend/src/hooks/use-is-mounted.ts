"use client"

import { useEffect, useState } from "react"

/**
 * Returns true once the component has mounted on the client.
 * Useful for deferring render of interactive UI until after hydration.
 */
export function useIsMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return isMounted
}


