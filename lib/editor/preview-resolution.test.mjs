import { expect, test } from 'bun:test'
import { previewSize } from './preview-resolution'

test('preview raster follows displayed width and screen density with a bounded backing surface', () => {
  expect(previewSize(850, 1)).toEqual({ width: 850, height: 479 })
  expect(previewSize(850, 2)).toEqual({ width: 1700, height: 958 })
  expect(previewSize(320, 2)).toEqual({ width: 640, height: 361 })
  expect(previewSize(3000, 4)).toEqual({ width: 1920, height: 1082 })
  expect(previewSize(1920, 1000)).toEqual({ width: 1920, height: 1082 })
  for (const width of [0, -1, NaN, Infinity]) {
    expect(previewSize(width, 1)).toEqual({ width: 568, height: 320 })
  }
  for (const density of [0, -1, NaN, Infinity]) {
    expect(previewSize(850, density)).toEqual({ width: 850, height: 479 })
  }
})
