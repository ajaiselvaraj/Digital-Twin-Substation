"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export type DataSource = "firebase" | "scada"

interface DataSourceContextValue {
  dataSource: DataSource
  setDataSource: (source: DataSource) => void
  scadaUrl: string
  setScadaUrl: (url: string) => void
}

const DataSourceContext = createContext<DataSourceContextValue | undefined>(undefined)

const STORAGE_KEY = "digital-twin-data-source"
const SCADA_URL_KEY = "digital-twin-scada-url"
const DEFAULT_SCADA_URL = "http://192.168.10.20:5000/scada-data"

export function DataSourceProvider({ children }: { children: ReactNode }) {
  const [dataSource, setDataSourceState] = useState<DataSource>("firebase")
  const [scadaUrl, setScadaUrlState] = useState<string>(DEFAULT_SCADA_URL)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "scada" || stored === "firebase") {
      setDataSourceState(stored)
    }
    
    const storedUrl = localStorage.getItem(SCADA_URL_KEY)
    if (storedUrl) {
      setScadaUrlState(storedUrl)
    }
  }, [])

  const setDataSource = (source: DataSource) => {
    setDataSourceState(source)
    localStorage.setItem(STORAGE_KEY, source)
  }

  const setScadaUrl = (url: string) => {
    setScadaUrlState(url)
    localStorage.setItem(SCADA_URL_KEY, url)
  }

  return (
    <DataSourceContext.Provider value={{ dataSource, setDataSource, scadaUrl, setScadaUrl }}>
      {children}
    </DataSourceContext.Provider>
  )
}

export function useDataSource() {
  const context = useContext(DataSourceContext)
  if (!context) {
    throw new Error("useDataSource must be used within DataSourceProvider")
  }
  return context
}

