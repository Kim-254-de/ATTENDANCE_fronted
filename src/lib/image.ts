/**
 * Downscales and re-compresses an image file into a JPEG data URL, so an avatar upload's payload
 * size doesn't depend on the source photo. Shared by the lecturer and student profile pages —
 * both post the result straight to POST /auth/me/avatar (see authApi.ts's useSetAvatar).
 */
export async function resizeImageFile(file: File, maxDim = 320, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not supported in this browser.')
  ctx.drawImage(bitmap, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', quality)
}
