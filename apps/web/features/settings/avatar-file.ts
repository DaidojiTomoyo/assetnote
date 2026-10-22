export async function prepareAvatar(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("请选择 PNG、JPEG 或 WebP 图片。")
  if (file.size > 5 * 1024 * 1024) throw new Error("图片不能超过 5 MB。")
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error("图片无法读取，请换一张图片。")
  }
  try {
    if (bitmap.width * bitmap.height > 16_000_000)
      throw new Error("图片尺寸过大，请选择不超过 1600 万像素的图片。")
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 256
    const context = canvas.getContext("2d")
    if (!context) throw new Error("浏览器无法处理头像，请换一个浏览器重试。")
    const size = Math.min(bitmap.width, bitmap.height)
    context.drawImage(
      bitmap,
      (bitmap.width - size) / 2,
      (bitmap.height - size) / 2,
      size,
      size,
      0,
      0,
      256,
      256
    )
    const result = canvas.toDataURL("image/webp", 0.8)
    if (result.length > 96_000)
      throw new Error("处理后的头像仍然过大，请换一张图片。")
    return result
  } finally {
    bitmap.close()
  }
}
