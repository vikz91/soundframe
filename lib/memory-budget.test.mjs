import { expect, test } from 'bun:test'
import {
  assertMemoryAvailable,
  memoryPolicy,
  MemoryBudgetError,
  retainMemory,
  withMemoryReservation
} from './memory-budget'

const MiB = 1024 * 1024

test('missing and invalid browser hints use the bounded fallback and preserve runtime headroom', () => {
  const boundary = memoryPolicy.fallbackBufferBytes - memoryPolicy.runtimeHeadroomBytes
  for (const deviceGiB of [undefined, NaN, Infinity, 0, -1]) {
    expect(() => assertMemoryAvailable({ buffers: boundary }, { deviceGiB })).not.toThrow()
    expect(() => assertMemoryAvailable({ buffers: boundary + 1 }, { deviceGiB })).toThrow(MemoryBudgetError)
  }
  for (const buffers of [-1, NaN, Infinity])
    expect(() => assertMemoryAvailable({ buffers }, {})).toThrow(MemoryBudgetError)
})

test('device hints lower the budget without allowing high-memory devices to exceed the cap', () => {
  expect(() => assertMemoryAvailable({ buffers: 384 * MiB }, { deviceGiB: 2 })).not.toThrow()
  expect(() => assertMemoryAvailable({ buffers: 384 * MiB + 1 }, { deviceGiB: 2 })).toThrow(MemoryBudgetError)
  expect(() => assertMemoryAvailable({ buffers: 896 * MiB }, { deviceGiB: 32 })).not.toThrow()
  expect(() => assertMemoryAvailable({ buffers: 896 * MiB + 1 }, { deviceGiB: 32 })).toThrow(MemoryBudgetError)
})

test('available heap is checked independently of the total buffer estimate with 20 percent headroom', () => {
  const capacity = { usedHeapBytes: 60 * MiB, heapLimitBytes: 100 * MiB }
  expect(() => assertMemoryAvailable({ buffers: 0, heap: 20 * MiB }, capacity)).not.toThrow()
  expect(() => assertMemoryAvailable({ buffers: 0, heap: 20 * MiB + 1 }, capacity)).toThrow(MemoryBudgetError)
  expect(() => assertMemoryAvailable({ buffers: 0, heap: 0 }, { ...capacity, usedHeapBytes: 81 * MiB })).toThrow(
    MemoryBudgetError
  )
  expect(() => assertMemoryAvailable({ buffers: 0, heap: 20 * MiB }, { heapLimitBytes: NaN })).not.toThrow()
})

test('retained media/results count across operations and release is idempotent', () => {
  const release = retainMemory(160 * MiB)
  try {
    expect(() => assertMemoryAvailable({ buffers: 481 * MiB }, {})).toThrow(MemoryBudgetError)
  } finally {
    release()
    release()
  }
  expect(() => assertMemoryAvailable({ buffers: 481 * MiB }, {})).not.toThrow()
})

test('concurrent work shares reservations and failed updates release the last successful estimate', async () => {
  await withMemoryReservation({ buffers: 400 * MiB }, async (update) => {
    await expect(withMemoryReservation({ buffers: 241 * MiB }, async () => {})).rejects.toThrow(MemoryBudgetError)
    update({ buffers: 200 * MiB })
    await withMemoryReservation({ buffers: 400 * MiB }, async () => {})
    expect(() => update({ buffers: 641 * MiB })).toThrow(MemoryBudgetError)
    expect(() => assertMemoryAvailable({ buffers: 441 * MiB }, {})).toThrow(MemoryBudgetError)
  })
  await expect(
    withMemoryReservation({ buffers: 400 * MiB }, async () => {
      throw new Error('cancelled')
    })
  ).rejects.toThrow('cancelled')
  expect(() => assertMemoryAvailable({ buffers: 640 * MiB }, {})).not.toThrow()
})
