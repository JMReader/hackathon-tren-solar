const key = (photoId: string) => `tren-solar.photo-preview.${photoId}`

export function getPhotoPreview(photoId: string | null | undefined) {
  if (!photoId || typeof window === "undefined") return null
  return window.sessionStorage.getItem(key(photoId))
}

export function savePhotoPreview(photoId: string, dataUrl: string) {
  try {
    window.sessionStorage.setItem(key(photoId), dataUrl)
  } catch {
    // sessionStorage lleno: la foto sigue guardada en el servidor
  }
}

export async function fileToPreviewDataUrl(
  file: File,
  maxSize = 256,
): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL("image/jpeg", 0.85)
}
