const MiB = 1024 * 1024

/** Provisional admission policy, not a measurement of available system RAM. */
export const memoryPolicy = {
  fallbackBufferBytes: 768 * MiB,
  maxBufferBytes: 1024 * MiB,
  runtimeHeadroomBytes: 128 * MiB,
  ffmpegEngineBytes: 256 * MiB,
  deviceFraction: 0.25,
  heapFraction: 0.8
} as const

export type MemoryEstimate = { buffers: number; heap?: number }
export type MemoryCapacity = { deviceGiB?: number; usedHeapBytes?: number; heapLimitBytes?: number }

export class MemoryBudgetError extends Error {
  constructor() {
    super(
      'Not enough memory headroom for this operation. Clear the previous video, use smaller files, or try a shorter track.'
    )
    this.name = 'MemoryBudgetError'
  }
}

function positive(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function browserCapacity(): MemoryCapacity {
  // These optional hints omit some workers/native allocations. Never treat them as total/free RAM.
  const device =
    typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const heap =
    typeof performance === 'undefined'
      ? undefined
      : (performance as Performance & { memory?: { usedJSHeapSize?: number; jsHeapSizeLimit?: number } }).memory
  return { deviceGiB: device, usedHeapBytes: heap?.usedJSHeapSize, heapLimitBytes: heap?.jsHeapSizeLimit }
}

let retainedBytes = 0

/** Buffers include native/WASM estimates; heap is the next additional JS allocation only. */
export function assertMemoryAvailable(estimate: MemoryEstimate, capacity = browserCapacity()) {
  checkEstimate(estimate, capacity)
}

function checkEstimate(estimate: MemoryEstimate, capacity: MemoryCapacity, credit = 0) {
  const heap = estimate.heap ?? 0
  if (!Number.isFinite(estimate.buffers) || estimate.buffers < 0 || !Number.isFinite(heap) || heap < 0)
    throw new MemoryBudgetError()
  const budget = positive(capacity.deviceGiB)
    ? Math.min(memoryPolicy.maxBufferBytes, capacity.deviceGiB * 1024 * MiB * memoryPolicy.deviceFraction)
    : memoryPolicy.fallbackBufferBytes
  if (retainedBytes - credit + estimate.buffers + memoryPolicy.runtimeHeadroomBytes > budget)
    throw new MemoryBudgetError()
  if (
    typeof capacity.usedHeapBytes === 'number' &&
    Number.isFinite(capacity.usedHeapBytes) &&
    capacity.usedHeapBytes >= 0 &&
    positive(capacity.heapLimitBytes) &&
    capacity.usedHeapBytes + heap > capacity.heapLimitBytes * memoryPolicy.heapFraction
  )
    throw new MemoryBudgetError()
}

/** Active operations reserve their working estimate so concurrent loads share the same budget. */
export async function withMemoryReservation<T>(
  estimate: MemoryEstimate,
  work: (update: (next: MemoryEstimate) => void) => Promise<T>
) {
  let bytes = 0
  const update = (next: MemoryEstimate) => {
    checkEstimate(next, browserCapacity(), bytes)
    retainedBytes += next.buffers - bytes
    bytes = next.buffers
  }
  update(estimate)
  try {
    return await work(update)
  } finally {
    retainedBytes -= bytes
  }
}

/** Account for accepted media/results until their owner releases them, including replacements. */
export function retainMemory(bytes: number) {
  assertMemoryAvailable({ buffers: bytes })
  retainedBytes += bytes
  let released = false
  return () => {
    if (released) return
    released = true
    retainedBytes -= bytes
  }
}
