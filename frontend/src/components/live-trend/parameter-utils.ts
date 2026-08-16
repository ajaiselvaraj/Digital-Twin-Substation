import { PARAMETER_METADATA } from "@/lib/live-trend/parameter-metadata"

const DEFAULT_IGNORED_KEYS = new Set(["timestamp", "lastUpdated", "source", "component", "id"])

const formatLabel = (key: string) => {
  if (!key) return "Unnamed Parameter"
  const withSpaces = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
  return withSpaces.replace(/\b\w/g, (char) => char.toUpperCase())
}

export interface ParameterConfig {
  key: string
  metadataKey: string
  label: string
  unit: string
}

export interface ParameterConfigOptions {
  alias?: Record<string, string>
  ignore?: string[]
}

export function buildParameterConfigs(
  data: Record<string, number | string | null | undefined>,
  preferredOrder: string[],
  options: ParameterConfigOptions = {},
): ParameterConfig[] {
  const aliasMap = options.alias ?? {}
  const ignored = new Set([...(options.ignore ?? []), ...DEFAULT_IGNORED_KEYS])

  const dynamicKeys = Object.keys(data ?? {}).filter((key) => !ignored.has(key))
  const mergedOrder = Array.from(new Set([...preferredOrder, ...dynamicKeys]))

  return mergedOrder.map((key) => {
    const metadataKey = aliasMap[key] ?? key
    const metadata = PARAMETER_METADATA[metadataKey]
    return {
      key,
      metadataKey,
      label: metadata?.name ?? formatLabel(key),
      unit: metadata?.unit ?? "",
    }
  })
}


