/** Abortable browser reads. Handlers are detached on success, failure, or cancellation. */
export function readFile(file: File, mode: 'arrayBuffer', signal?: AbortSignal): Promise<ArrayBuffer>
export function readFile(file: File, mode: 'dataURL' | 'text', signal?: AbortSignal): Promise<string>
export function readFile(file: File, mode: 'arrayBuffer' | 'dataURL' | 'text', signal?: AbortSignal) {
  return new Promise<ArrayBuffer | string>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('File read cancelled.', 'AbortError'))
      return
    }
    const reader = new FileReader()
    const cleanup = () => {
      reader.onload = null
      reader.onerror = null
      reader.onabort = null
      signal?.removeEventListener('abort', abort)
    }
    const abort = () => {
      cleanup()
      reader.abort()
      reject(new DOMException('File read cancelled.', 'AbortError'))
    }
    reader.onload = () => {
      const result = reader.result
      cleanup()
      if (mode === 'arrayBuffer' ? result instanceof ArrayBuffer : typeof result === 'string') {
        resolve(result as ArrayBuffer | string)
      } else reject(new Error('We could not read this file.'))
    }
    reader.onerror = () => {
      const error = reader.error
      cleanup()
      reject(error ?? new Error('We could not read this file. Please try again.'))
    }
    reader.onabort = abort
    signal?.addEventListener('abort', abort, { once: true })
    try {
      if (mode === 'arrayBuffer') reader.readAsArrayBuffer(file)
      else if (mode === 'dataURL') reader.readAsDataURL(file)
      else reader.readAsText(file)
    } catch (error) {
      cleanup()
      reject(error)
    }
  })
}

export function loadImage(src: string, signal?: AbortSignal) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Image load cancelled.', 'AbortError'))
      return
    }
    const image = new Image()
    const cleanup = () => {
      image.onload = null
      image.onerror = null
      signal?.removeEventListener('abort', abort)
    }
    const abort = () => {
      cleanup()
      image.src = ''
      reject(new DOMException('Image load cancelled.', 'AbortError'))
    }
    image.onload = () => {
      cleanup()
      resolve(image)
    }
    image.onerror = () => {
      cleanup()
      image.src = ''
      reject(new Error('This image cannot be opened. Try another JPG or PNG.'))
    }
    signal?.addEventListener('abort', abort, { once: true })
    image.src = src
  })
}

/** The caller owns the URL lifetime so the browser can consume it after clicking. */
export function downloadURL(url: string, filename: string) {
  const link = document.createElement('a')
  link.download = filename
  link.href = url
  document.body.append(link)
  try {
    link.click()
  } finally {
    link.remove()
  }
}
