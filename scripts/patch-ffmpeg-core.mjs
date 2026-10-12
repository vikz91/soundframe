/** core 0.12.10 exits commands through an abort without unwinding the WASM stack.
 * Its reset() only clears status/timeout. Restore the entry stack after each
 * synchronous command so sequential Canvas batches cannot exhaust it.
 * Match the binding exactly and fail closed when an upstream upgrade changes it.
 */
export function patchFFmpegCore(source) {
  if (!source.includes('var stackSave=') || !source.includes('var stackRestore='))
    throw new Error('FFmpeg stack helpers changed; review the core compatibility patch before serving assets.')
  for (const [name, defaults, native] of [
    ['exec', 'DEFAULT_ARGS', '_ffmpeg'],
    ['ffprobe', 'DEFAULT_ARGS_FFPROBE', '_ffprobe']
  ]) {
    const original = `function ${name}(..._args){const args=[...Module["${defaults}"],..._args];try{Module["${native}"](args.length,stringsToPtr(args))}catch(e){if(!e.message.startsWith("Aborted")){throw e}}return Module["ret"]}`
    if (source.split(original).length !== 2)
      throw new Error(`FFmpeg ${name} binding changed; review the core compatibility patch before serving assets.`)
    const replacement = original
      .replace('try{', 'const entryStack=stackSave();try{')
      .replace('return Module["ret"]', 'finally{stackRestore(entryStack)}return Module["ret"]')
    source = source.replace(original, replacement)
  }
  return source
}
