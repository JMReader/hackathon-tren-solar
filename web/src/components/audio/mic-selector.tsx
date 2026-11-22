"use client"

import { ChevronsUpDown, Mic, MicOff } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroupLabel,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu"
import { cn } from "@/lib/utils"
import { LiveWaveform } from "./live-waveform"

type AudioDevice = { deviceId: string; label: string }

function toDevices(list: MediaDeviceInfo[]): AudioDevice[] {
  return list
    .filter((device) => device.kind === "audioinput" && device.deviceId)
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label.replace(/\s*\([^)]*\)/g, "").trim() || `Micrófono ${index + 1}`,
    }))
}

function useAudioDevices() {
  const [devices, setDevices] = useState<AudioDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState(false)

  const refresh = useCallback(async (askPermission: boolean) => {
    setLoading(true)
    setError(null)
    try {
      if (!navigator.mediaDevices) throw new Error("Este navegador no permite grabar audio")
      if (askPermission) {
        const temp = await navigator.mediaDevices.getUserMedia({ audio: true })
        temp.getTracks().forEach((track) => track.stop())
        setHasPermission(true)
      }
      setDevices(toDevices(await navigator.mediaDevices.enumerateDevices()))
    } catch (err) {
      setError(err instanceof DOMException ? "Sin permiso para el micrófono" : (err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const media = navigator.mediaDevices
    const onChange = () => void refresh(false)
    queueMicrotask(onChange)
    media?.addEventListener("devicechange", onChange)
    return () => media?.removeEventListener("devicechange", onChange)
  }, [refresh])

  return { devices, loading, error, hasPermission, requestPermission: () => refresh(true) }
}

type MicSelectorProps = {
  value?: string
  onValueChange?: (deviceId: string) => void
  muted?: boolean
  onMutedChange?: (muted: boolean) => void
  disabled?: boolean
  className?: string
}

function MicSelector({ value, onValueChange, muted, onMutedChange, disabled, className }: MicSelectorProps) {
  const { devices, loading, error, hasPermission, requestPermission } = useAudioDevices()
  const [internalValue, setInternalValue] = useState(value ?? "")
  const [internalMuted, setInternalMuted] = useState(false)
  const [open, setOpen] = useState(false)

  const selected = value ?? (internalValue || devices[0]?.deviceId || "")
  const isMuted = muted ?? internalMuted
  const current = devices.find((device) => device.deviceId === selected)
  const triggerLabel = current?.label ?? (loading ? "Buscando micrófonos…" : error ?? "Micrófono predeterminado")

  return (
    <Menu
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next && !hasPermission) void requestPermission()
      }}
    >
      <MenuTrigger
        render={<Button variant="ghost" size="sm" />}
        disabled={disabled}
        className={cn("w-56 max-w-full justify-start px-3", className)}
      >
        {isMuted ? <MicOff aria-hidden className="text-danger" /> : <Mic aria-hidden />}
        <span className="min-w-0 flex-1 truncate text-left">{triggerLabel}</span>
        <ChevronsUpDown aria-hidden className="!size-3.5 text-ink-muted" />
      </MenuTrigger>
      <MenuContent side="top" className="w-72">
        {error ? (
          <MenuItem disabled>{error}</MenuItem>
        ) : (
          <MenuRadioGroup
            value={selected}
            onValueChange={(next) => {
              setInternalValue(next as string)
              onValueChange?.(next as string)
            }}
          >
            <MenuGroupLabel>Micrófono</MenuGroupLabel>
            {loading && devices.length === 0 ? (
              <MenuItem disabled>Buscando micrófonos…</MenuItem>
            ) : (
              devices.map((device) => (
                <MenuRadioItem key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </MenuRadioItem>
              ))
            )}
          </MenuRadioGroup>
        )}
        {devices.length > 0 && (
          <>
            <MenuSeparator />
            <MenuCheckboxItem
              value="muted"
              checked={isMuted}
              onCheckedChange={(next) => {
                setInternalMuted(next)
                onMutedChange?.(next)
              }}
            >
              Silenciar micrófono
            </MenuCheckboxItem>
            <div className="mx-1 mt-1 mb-0.5 rounded-lg bg-sunken px-2.5 py-2" aria-hidden>
              <LiveWaveform
                active={open && !isMuted && hasPermission}
                deviceId={selected || undefined}
                mode="static"
                height={18}
                barWidth={2}
                barGap={1.5}
                fadeEdges={false}
                className="text-ink"
              />
            </div>
          </>
        )}
      </MenuContent>
    </Menu>
  )
}

export { MicSelector, useAudioDevices, type AudioDevice }
