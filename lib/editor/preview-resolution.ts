import { compositionSize } from './composition'

/** Rasterize at display density rather than enlarging the small export raster.
 * Cap the preview's single backing surface at about two million pixels.
 */
export function previewSize(displayWidth: number, pixelRatio: number) {
  const density = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1
  const measuredWidth = Number.isFinite(displayWidth) && displayWidth > 0 ? displayWidth : compositionSize.width
  const width = Math.max(compositionSize.width, Math.min(1920, Math.ceil(measuredWidth * density)))
  return { width, height: Math.round((width * compositionSize.height) / compositionSize.width) }
}
