"use client"

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { applyGlow, removeGlow, getGlowColor } from "@/lib/live-trend/glow-utils"
import { applyTimelineColorTransition } from "@/lib/live-trend/parameter-color-mapping"
import { updateTransformerGlow, removeTransformerGlow } from "@/lib/live-trend/transformer-glow-utils"
import { updateCircuitBreakerGlow, removeCircuitBreakerGlow } from "@/lib/live-trend/circuit-breaker-glow-utils"
import {
  getFaultProbabilityColor,
  getOverallHealthColor,
} from "@/lib/simulation-color-coding"
import { Button } from "@/components/ui/button"
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react"
import { createFallbackModel } from "@/components/simulation/fallback-models"

type ViewerComponentType =
  | "transformer"
  | "bayLines"
  | "circuitBreaker"
  | "isolator"
  | "busbar"
  | "substation"

interface ModelViewerProps {
  modelPath: string | null
  glowData?: Record<string, number | string>
  showGlow?: boolean
  className?: string
  componentType?: ViewerComponentType
  useFallback?: boolean
  autoRotate?: boolean
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void
  // Optional in-scene HUD metrics that will be rendered into the WebGL canvas
  hudMetrics?: {
    overall: number
    fault: number
    stress: number
    aging: number
  } | null
  hudVisible?: boolean
  // Parameter-based color system
  parameterColor?: string | null
  showParameterColor?: boolean
  // Timeline-based color transitions
  timelineSnapshot?: any
  simulationProgress?: number
}

type ViewPreset = "iso" | "top" | "side" | "front" | "back"

export function ModelViewer({
  modelPath,
  glowData = {},
  showGlow = false,
  className = "",
  componentType,
  useFallback = false,
  autoRotate = false,
  onCanvasReady,
  hudMetrics,
  hudVisible = true,
  parameterColor = null,
  showParameterColor = false,
  timelineSnapshot = null,
  simulationProgress = 0,
}: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const modelRef = useRef<THREE.Group | null>(null)
  const cameraTargetRef = useRef<THREE.Vector3 | null>(null)
  const cameraDistanceRef = useRef(6)
  const autoRotateRef = useRef(autoRotate)
  const mountedRef = useRef(true)
  const hudCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const hudTextureRef = useRef<THREE.CanvasTexture | null>(null)
  const hudMeshRef = useRef<THREE.Mesh | null>(null)
  const hudAnchorRef = useRef<THREE.Object3D | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasModel, setHasModel] = useState(Boolean(useFallback))
  const [sceneReady, setSceneReady] = useState(false)
  const [modelLoadAttempted, setModelLoadAttempted] = useState(false)
  const glowDataRef = useRef(glowData)
  const showGlowRef = useRef(showGlow)

  useEffect(() => {
    glowDataRef.current = glowData
  }, [glowData])

  useEffect(() => {
    showGlowRef.current = showGlow
  }, [showGlow])

  useEffect(() => {
    if (useFallback) {
      setHasModel(true)
      setIsLoading(false)
      setError(null)
    }
  }, [useFallback])

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const syncCameraDistance = () => {
    if (!cameraRef.current || !cameraTargetRef.current) return
    cameraDistanceRef.current = cameraRef.current.position.distanceTo(cameraTargetRef.current)
  }

  const disposeCurrentModel = (options: { skipState?: boolean } = {}) => {
    if (!sceneRef.current || !modelRef.current) {
      return
    }

    sceneRef.current.remove(modelRef.current)
    removeGlow(modelRef.current)
    modelRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose())
        } else if (child.material) {
          child.material.dispose()
        }
      }
    })
    modelRef.current = null
    if (!options.skipState && mountedRef.current) {
      setHasModel(false)
    }
  }

  const updateHudAnchorOffset = () => {
    if (!hudAnchorRef.current) return
    const depth = -Math.max(4.5, cameraDistanceRef.current * 0.7)
    const horizontalOffset = Math.max(2.4, Math.min(4.2, cameraDistanceRef.current * 0.38))
    const verticalOffset = -Math.max(1.6, Math.min(2.6, cameraDistanceRef.current * 0.25))
    hudAnchorRef.current.position.set(horizontalOffset, verticalOffset, depth)
  }

  const positionCameraToModel = (
    model: THREE.Object3D,
    options?: {
      distanceScale?: number
      minDistanceMultiplier?: number
      maxDistanceMultiplier?: number
      minDistanceFloor?: number
      maxDistanceCeiling?: number
      distanceBias?: number
    },
  ) => {
    if (!cameraRef.current || !controlsRef.current) return
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = options?.distanceScale ?? 1.8
    const minDistance = Math.max(options?.minDistanceFloor ?? 1, maxDim * (options?.minDistanceMultiplier ?? 0.4))
    const maxDistance = Math.max(options?.maxDistanceCeiling ?? 50, maxDim * (options?.maxDistanceMultiplier ?? 6))
    const distance = Math.max(minDistance + (options?.distanceBias ?? 0), maxDim * scale)
    const offset = new THREE.Vector3(distance, distance * 0.6, distance)

    cameraRef.current.position.copy(center.clone().add(offset))
    cameraRef.current.lookAt(center)
    controlsRef.current.target.copy(center)
    controlsRef.current.minDistance = minDistance
    controlsRef.current.maxDistance = maxDistance
    controlsRef.current.update()
    cameraTargetRef.current = center.clone()
    cameraDistanceRef.current = distance
    updateHudAnchorOffset()
  }

  const ensureHudPanel = () => {
    if (!sceneRef.current || hudMeshRef.current) return

    // Create larger, higher resolution canvas for better visibility in playback video
    const canvas = document.createElement("canvas")
    canvas.width = 1536 // Increased width for larger text
    canvas.height = 768 // Increased height for larger text
    const texture = new THREE.CanvasTexture(canvas)
    // Use default color space; explicit sRGBEncoding is not available in current three version
    texture.needsUpdate = true

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1,
      depthTest: false, // Always render on top
      depthWrite: false,
    })
    
    // Larger geometry for better visibility
    const geometry = new THREE.PlaneGeometry(6.5, 3.2) // Increased size for larger text
    const mesh = new THREE.Mesh(geometry, material)
    
    // Attach to camera anchor so it stays in bottom-right corner of frame
    mesh.position.set(0, 0, 0)
    mesh.renderOrder = 1000 // Higher render order to ensure visibility

    if (hudAnchorRef.current) {
      hudAnchorRef.current.add(mesh)
    } else {
      sceneRef.current.add(mesh)
    }

    hudCanvasRef.current = canvas
    hudTextureRef.current = texture
    hudMeshRef.current = mesh
  }

  const updateHudTexture = () => {
    if (!hudCanvasRef.current || !hudTextureRef.current || !hudMetrics) return
    const canvas = hudCanvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Enhanced panel background with border and shadow
    const radius = 32
    const w = canvas.width - 60
    const h = canvas.height - 60
    const x = 30
    const y = 30

    // Drop shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)"
    ctx.shadowBlur = 20
    ctx.shadowOffsetX = 4
    ctx.shadowOffsetY = 4

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.9)" // More opaque
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + w - radius, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
    ctx.lineTo(x + w, y + h - radius)
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
    ctx.lineTo(x + radius, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
    ctx.fill()

    // Reset shadow
    ctx.shadowColor = "transparent"
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    // Border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)"
    ctx.lineWidth = 2
    ctx.stroke()

    // Title - increased size for better visibility in playback video
    ctx.font = "bold 56px system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    ctx.fillStyle = "#ffffff"
    ctx.textBaseline = "top"
    ctx.fillText("Parameters", x + 40, y + 30)

    // Parameter rows with color coding (True Health, Stress, Fault, Aging)
    const rows = [
      ["True Health", `${hudMetrics.overall.toFixed(1)}%`, getParameterDisplayColor(hudMetrics.overall, "trueHealth")],
      ["Stress Score", `${hudMetrics.stress.toFixed(1)}%`, getParameterDisplayColor(hudMetrics.stress, "stressScore")],
      ["Fault Probability", `${hudMetrics.fault.toFixed(1)}%`, getParameterDisplayColor(hudMetrics.fault, "faultProbability")],
      ["Aging Factor", `${hudMetrics.aging.toFixed(1)}%`, getParameterDisplayColor(hudMetrics.aging, "agingFactor")],
    ] as const

    // Increased font size for better visibility in playback video
    ctx.font = "bold 48px system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    const startX = x + 40
    let rowY = y + 120

    rows.forEach(([label, value, color]) => {
      // Label
      ctx.fillStyle = "#d1d5db"
      ctx.fillText(label, startX, rowY)
      
      // Value with color coding
      ctx.fillStyle = color
      ctx.fillText(value, startX + 400, rowY)
      
      // Color indicator dot - increased size
      ctx.beginPath()
      ctx.arc(startX + 680, rowY + 24, 18, 0, 2 * Math.PI)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 3
      ctx.stroke()
      
      rowY += 80 // Increased spacing between rows
    })

    hudTextureRef.current.needsUpdate = true
  }

  // Helper function to get display color for parameters
  const getParameterDisplayColor = (value: number, parameter: string): string => {
    switch (parameter) {
      case "trueHealth":
        // Use Overall Health color coding (high values = good health)
        return getOverallHealthColor(value)
      case "stressScore":
        // Keep existing stress score color scheme
        if (value <= 20) return "#3b82f6" // Blue
        if (value <= 40) return "#06b6d4" // Cyan
        if (value <= 60) return "#f59e0b" // Yellow
        if (value <= 80) return "#f97316" // Orange
        return "#ef4444" // Red
      case "faultProbability":
        // Use Fault Probability color coding (0-100%)
        return getFaultProbabilityColor(value)
      case "agingFactor":
        // Keep existing aging factor color scheme
        if (value >= 80) return "#f8fafc" // White
        if (value >= 60) return "#cbd5e1" // Light Gray
        if (value >= 40) return "#94a3b8" // Gray
        if (value >= 20) return "#64748b" // Dark Gray
        return "#374151" // Very Dark Gray
      default:
        return "#ffffff"
    }
  }

  // Initialize scene
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0f0f0f)
    sceneRef.current = scene

    // Camera - will be adjusted when model loads
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000)
    camera.position.set(6, 4, 6)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera
    scene.add(camera)

    const hudAnchor = new THREE.Object3D()
    hudAnchor.position.set(2.8, -2.0, -4.8)
    camera.add(hudAnchor)
    hudAnchorRef.current = hudAnchor

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2.5))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.domElement.style.touchAction = "none"
    renderer.domElement.style.cursor = "grab"
    const handlePointerDown = () => {
      renderer.domElement.style.cursor = "grabbing"
    }
    const handlePointerUp = () => {
      renderer.domElement.style.cursor = "grab"
    }
    renderer.domElement.addEventListener("pointerdown", handlePointerDown)
    renderer.domElement.addEventListener("pointerup", handlePointerUp)
    renderer.domElement.addEventListener("pointerleave", handlePointerUp)
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer
    onCanvasReady?.(renderer.domElement)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 2
    controls.maxDistance = 20
    controls.enablePan = true
    controls.screenSpacePanning = true
    controls.enableZoom = true
    controls.enableRotate = true
    controls.enableKeys = false
    controls.minPolarAngle = 0
    controls.maxPolarAngle = Math.PI
    controls.autoRotate = autoRotateRef.current
    controls.autoRotateSpeed = autoRotateRef.current ? 0.35 : 0
    controlsRef.current = controls
    const handleControlChange = () => syncCameraDistance()
    const handleControlStart = () => {
      controls.autoRotate = false
    }
    const handleControlEnd = () => {
      controls.autoRotate = autoRotateRef.current
    }
    controls.addEventListener("change", handleControlChange)
    controls.addEventListener("start", handleControlStart)
    controls.addEventListener("end", handleControlEnd)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(8, 12, 6)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    const rimLight = new THREE.DirectionalLight(0x66ccff, 0.5)
    rimLight.position.set(-6, 4, -6)
    scene.add(rimLight)

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      updateHudAnchorOffset()
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return
      const newWidth = containerRef.current.clientWidth
      const newHeight = containerRef.current.clientHeight
      camera.aspect = newWidth / newHeight
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, newHeight)
    }
    window.addEventListener("resize", handleResize)

    queueMicrotask(() => setSceneReady(true))

    return () => {
      window.removeEventListener("resize", handleResize)
      disposeCurrentModel({ skipState: true })
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement)
      }
      renderer.dispose()
      onCanvasReady?.(null)
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown)
      renderer.domElement.removeEventListener("pointerup", handlePointerUp)
      renderer.domElement.removeEventListener("pointerleave", handlePointerUp)
      controls.removeEventListener("change", handleControlChange)
      controls.removeEventListener("start", handleControlStart)
      controls.removeEventListener("end", handleControlEnd)
      controls.dispose()
      if (hudAnchorRef.current && cameraRef.current) {
        cameraRef.current.remove(hudAnchorRef.current)
      }
      hudAnchorRef.current = null
    }
  }, [])

  // Load model (decoupled from realtime glow updates to keep controls responsive)
  useEffect(() => {
    if (!sceneReady || !sceneRef.current) {
      return
    }

    let didCancel = false

    const safeSetState = <T,>(setter: Dispatch<SetStateAction<T>>, value: SetStateAction<T>) => {
      if (mountedRef.current && !didCancel) {
        setter(value)
      }
    }

    const loadFallbackModel = () => {
      if (didCancel || !sceneRef.current) return

      disposeCurrentModel()
      // Use a black background to keep fallback visuals consistent across pages
      sceneRef.current.background = new THREE.Color(0x000000)

      const fallbackType: ViewerComponentType = componentType ?? "substation"
      const model = createFallbackModel(fallbackType, glowDataRef.current, showGlowRef.current)
      sceneRef.current.add(model)
      modelRef.current = model
      ensureHudPanel()
      const isSubstationFallback = fallbackType === "substation"
      positionCameraToModel(model, {
        distanceScale: isSubstationFallback ? 0.5 : 1.35,
        minDistanceMultiplier: isSubstationFallback ? 0.12 : undefined,
        maxDistanceMultiplier: isSubstationFallback ? 10 : undefined,
        minDistanceFloor: isSubstationFallback ? 0.25 : undefined,
        maxDistanceCeiling: isSubstationFallback ? 120 : undefined,
        distanceBias: isSubstationFallback ? 0.15 : undefined,
      })
      safeSetState(setHasModel, true)
      safeSetState(setIsLoading, false)
      safeSetState(setError, null)
      safeSetState(setModelLoadAttempted, true)
    }

    const resolveUrl = (path: string) => {
      if (/^(https?:)?\/\//i.test(path)) {
        return path
      }
      const normalized = path.startsWith("/") ? path : `/${path}`
      return `${window.location.origin}${normalized}`
    }

    const checkModelAvailability = async (path: string) => {
      try {
        const url = resolveUrl(path)
        const response = await fetch(url, { method: "HEAD" })
        return response.ok
      } catch (error) {
        console.warn("Unable to verify 3D model availability", error)
        return false
      }
    }

    const clearLoaderTimeout = (timeoutId: number | null) => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }

    const startLoading = async () => {
      const trimmedPath = modelPath?.trim() ?? ""
      let shouldUseFallback = useFallback || !trimmedPath

      if (!shouldUseFallback && trimmedPath) {
        const exists = await checkModelAvailability(trimmedPath)
        shouldUseFallback = !exists
      }

      if (didCancel) return

      if (shouldUseFallback) {
        loadFallbackModel()
        return
      }

      safeSetState(setIsLoading, true)
      safeSetState(setError, null)
      safeSetState(setModelLoadAttempted, true)

      let timeoutId: number | null = window.setTimeout(() => {
        console.warn(`Timed out loading model ${trimmedPath}. Showing fallback instead.`)
        loadFallbackModel()
      }, 8000)

      const loader = new GLTFLoader()
      loader.load(
        trimmedPath,
        (gltf) => {
          if (didCancel || !sceneRef.current) return
          clearLoaderTimeout(timeoutId)
          timeoutId = null

          disposeCurrentModel()

          const model = gltf.scene
          model.scale.set(1, 1, 1)
          model.position.set(0, 0, 0)

          const box = new THREE.Box3().setFromObject(model)
          const center = box.getCenter(new THREE.Vector3())
          model.position.sub(center)

          sceneRef.current.add(model)
          modelRef.current = model
          ensureHudPanel()
          positionCameraToModel(model)
          // Set hasModel to true FIRST to immediately hide the "not available" message
          safeSetState(setHasModel, true)
          safeSetState(setIsLoading, false)
          safeSetState(setModelLoadAttempted, true)
          console.log("[ModelViewer] GLB model loaded successfully, hasModel set to true")
        },
        undefined,
        () => {
          if (didCancel) return
          clearLoaderTimeout(timeoutId)
          timeoutId = null
          loadFallbackModel()
        }
      )

      return timeoutId
    }

    let pendingTimeout: number | null = null
    startLoading()
      .then((timeoutId) => {
        pendingTimeout = timeoutId ?? null
      })
      .catch((error) => {
        console.error("Failed to start model viewer", error)
        loadFallbackModel()
      })

    return () => {
      didCancel = true
      clearLoaderTimeout(pendingTimeout)
    }
  }, [modelPath, componentType, useFallback, sceneReady])

  // Apply glow effects
  useEffect(() => {
    if (!modelRef.current || !sceneRef.current) {
      return
    }

    // For transformer component, use transformer-specific glow logic
    if (componentType === "transformer") {
      // Remove all existing glows first
      removeTransformerGlow(modelRef.current)

      // Apply transformer-specific glow based on data - always apply if we have data
      // The transformer glow system determines colors based on thresholds, so we need all values
      if (Object.keys(glowData).length > 0 && modelRef.current) {
        // Map glowData keys to transformer parameter names
        const transformerValues: Record<string, number | string> = {}
        
        // Map common parameter names to transformer-specific names
        Object.entries(glowData).forEach(([key, value]) => {
          // Map common names to transformer-specific names
          if (key === "windingTemperature" || key === "windingTemp") {
            transformerValues.windingTemp = value
          } else if (key === "oilTemperature" || key === "oilTemp") {
            transformerValues.oilTemp = value
          } else if (key === "gasLevel" || key === "hydrogen" || key === "hydrogenPPM") {
            transformerValues.gasLevel = value
          } else if (key === "tapPosition" || key === "tapPos") {
            transformerValues.tapPos = value
          } else if (key === "oilLevel") {
            transformerValues.oilLevel = value
          } else {
            // Keep original key if it matches transformer parameter names
            transformerValues[key] = value
          }
        })

        // Always apply glow for transformer - the glow system will determine colors
        if (Object.keys(transformerValues).length > 0) {
          console.log("[ModelViewer] Applying transformer glow with values:", transformerValues)
          updateTransformerGlow(modelRef.current, transformerValues)
        }
      }

      return () => {
        if (modelRef.current) {
          removeTransformerGlow(modelRef.current)
        }
      }
    } else if (componentType === "circuitBreaker") {
      // For circuit breaker component, use circuit breaker-specific glow logic
      // Remove all existing glows first
      removeCircuitBreakerGlow(modelRef.current)

      // Apply circuit breaker-specific glow based on data - always apply if we have data
      // The circuit breaker glow system determines colors based on thresholds, so we need all values
      if (Object.keys(glowData).length > 0 && modelRef.current) {
        // Map glowData keys to circuit breaker parameter names
        const circuitBreakerValues: Record<string, number | string> = {}
        
        // Map common parameter names to circuit breaker-specific names
        Object.entries(glowData).forEach(([key, value]) => {
          // Map common names to circuit breaker-specific names
          if (key === "sf6Density" || key === "sf6DensityPercent" || key === "sf6Pressure") {
            circuitBreakerValues.sf6Density = value
          } else {
            // Keep original key if it matches circuit breaker parameter names
            circuitBreakerValues[key] = value
          }
        })

        // Always apply glow for circuit breaker - the glow system will determine colors
        if (Object.keys(circuitBreakerValues).length > 0) {
          console.log("[ModelViewer] Applying circuit breaker glow with values:", circuitBreakerValues)
          updateCircuitBreakerGlow(modelRef.current, circuitBreakerValues)
        }
      }

      return () => {
        if (modelRef.current) {
          removeCircuitBreakerGlow(modelRef.current)
        }
      }
    } else {
      // For other components, use standard glow logic
      // Remove all existing glows first
      if (modelRef.current) {
        removeGlow(modelRef.current)
      }

      // Apply glow based on data if showGlow is true
      if (showGlow && Object.keys(glowData).length > 0 && modelRef.current) {
        Object.entries(glowData).forEach(([key, value]) => {
          const glowColor = getGlowColor(key, value)
          if (glowColor && modelRef.current) {
            applyGlow(modelRef.current, glowColor)
          }
        })
      }

      return () => {
        if (modelRef.current) {
          removeGlow(modelRef.current)
        }
      }
    }
  }, [glowData, showGlow, componentType])

  // Apply parameter-based color effects
  useEffect(() => {
    if (!modelRef.current || !sceneRef.current) {
      return
    }

    // Apply parameter color if enabled
    if (showParameterColor && parameterColor && modelRef.current) {
      modelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material
          if (material instanceof THREE.MeshStandardMaterial) {
            // Store original color if not already stored
            if (!child.userData.originalColor) {
              child.userData.originalColor = material.color.clone()
            }
            
            // Apply parameter color
            const targetColor = new THREE.Color(parameterColor)
            material.color.copy(targetColor)
            material.emissive.copy(targetColor).multiplyScalar(0.3)
            material.emissiveIntensity = 1.1
            material.needsUpdate = true
          }
        }
      })
    } else if (modelRef.current) {
      // Reset to original colors when parameter color is disabled
      modelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.originalColor) {
          const material = child.material
          if (material instanceof THREE.MeshStandardMaterial) {
            material.color.copy(child.userData.originalColor)
            material.emissive.set(0x000000)
            material.emissiveIntensity = 0
            material.needsUpdate = true
          }
        }
      })
    }
  }, [parameterColor, showParameterColor])

  // Apply timeline-based color transitions for simulation
  useEffect(() => {
    if (!modelRef.current || !sceneRef.current) {
      return
    }

    // Apply timeline color transition if we have timeline data and are in playback mode
    if (timelineSnapshot && (simulationProgress > 0 || showParameterColor)) {
      console.log("[ColorTransition] Applying color transition:", {
        simulationProgress,
        trueHealth: timelineSnapshot.trueHealth,
        stressScore: timelineSnapshot.stressScore,
        faultProbability: timelineSnapshot.faultProbability,
        agingFactor: timelineSnapshot.agingFactor
      })
      
      applyTimelineColorTransition(modelRef.current, timelineSnapshot, Math.max(0.1, simulationProgress))
    } else if (modelRef.current && simulationProgress === 0 && !showParameterColor) {
      // Reset to original colors when simulation is not active
      modelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.originalColor) {
          const material = child.material
          if (material instanceof THREE.MeshStandardMaterial) {
            material.color.copy(child.userData.originalColor)
            material.emissive.set(0x000000)
            material.emissiveIntensity = 0
            material.needsUpdate = true
            delete child.userData.currentTransitionColor
          }
        }
      })
    }
  }, [timelineSnapshot, simulationProgress, showParameterColor])

  // Update HUD panel visibility and texture when metrics change
  useEffect(() => {
    if (!hudMeshRef.current) return
    hudMeshRef.current.visible = Boolean(hudMetrics) && hudVisible
    if (hudMetrics && hudVisible) {
      updateHudTexture()
    }
  }, [hudMetrics, hudVisible])

  useEffect(() => {
    autoRotateRef.current = autoRotate
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate
      controlsRef.current.autoRotateSpeed = autoRotate ? 0.6 : 0
      controlsRef.current.update()
    }
  }, [autoRotate])

  const handleResetCamera = () => {
    if (modelRef.current) {
      positionCameraToModel(modelRef.current)
    }
  }

  const zoomCamera = (scale: number) => {
    if (!cameraRef.current || !cameraTargetRef.current) return
    const direction = cameraRef.current.position.clone().sub(cameraTargetRef.current)
    direction.multiplyScalar(scale)
    cameraRef.current.position.copy(cameraTargetRef.current.clone().add(direction))
    controlsRef.current?.update()
    syncCameraDistance()
  }

  const handleZoomIn = () => zoomCamera(0.85)
  const handleZoomOut = () => zoomCamera(1.15)

  const moveCameraToPreset = (direction: THREE.Vector3) => {
    if (!cameraRef.current || !cameraTargetRef.current) return
    const distance = cameraDistanceRef.current || direction.length() || 6
    const offset = direction.clone().normalize().multiplyScalar(distance)
    cameraRef.current.position.copy(cameraTargetRef.current.clone().add(offset))
    cameraRef.current.lookAt(cameraTargetRef.current)
    controlsRef.current?.update()
    syncCameraDistance()
  }

  const handleViewChange = (preset: ViewPreset) => {
    const directions: Record<ViewPreset, THREE.Vector3> = {
      iso: new THREE.Vector3(1, 0.8, 1),
      top: new THREE.Vector3(0, 1, 0.0001),
      side: new THREE.Vector3(1, 0.2, 0),
      front: new THREE.Vector3(0, 0.3, 1),
      back: new THREE.Vector3(0, 0.3, -1),
    }
    moveCameraToPreset(directions[preset])
  }

  const viewButtons: Array<{ id: ViewPreset; label: string }> = [
    { id: "iso", label: "Isometric" },
    { id: "front", label: "Front" },
    { id: "side", label: "Side" },
    { id: "top", label: "Top" },
  ]

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={containerRef} className="w-full h-full" />

      {/* View buttons */}
      <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
        {viewButtons.map((button) => (
          <Button
            key={button.id}
            variant="secondary"
            size="sm"
            onClick={() => handleViewChange(button.id)}
            className="bg-white/90 hover:bg-white text-gray-900 border-gray-200 shadow-md backdrop-blur-sm"
          >
            {button.label}
          </Button>
        ))}
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={handleResetCamera}
          title="Reset Camera"
          className="bg-white/90 hover:bg-white border-gray-300 shadow-md backdrop-blur-sm"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomIn}
          title="Zoom In"
          className="bg-white/90 hover:bg-white border-gray-300 shadow-md backdrop-blur-sm"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="bg-white/90 hover:bg-white border-gray-300 shadow-md backdrop-blur-sm"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white">Loading 3D Model...</div>
        </div>
      )}

      {/* Error - only show for actual errors, not missing models */}
      {error && error !== "Failed to load 3D model and no fallback available" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-red-500">{error}</div>
        </div>
      )}

      {/* No model message - show when model fails to load and no fallback */}
      {/* Only show if we've attempted to load, it's not loading, no error, no model, and not using fallback */}
      {!useFallback && modelLoadAttempted && !isLoading && !error && !hasModel && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-20 pointer-events-none">
          <div className="text-gray-400 text-center">
            <p className="text-lg mb-2">3D Model Not Available</p>
            <p className="text-sm">Model will be available soon</p>
          </div>
        </div>
      )}

      <div className="absolute left-4 bottom-4 z-10 rounded-full bg-black/60 text-white text-xs px-4 py-1.5 pointer-events-none">
        Drag to rotate | Scroll to zoom
      </div>
    </div>
  )
}

