/** Shared timeline limit for inputs, exports, UI guidance, and lyric offsets. */
export const MAX_AUDIO_MINUTES = 15
export const MAX_AUDIO_SECONDS = MAX_AUDIO_MINUTES * 60

/** Validation decodes only establish audio presence/duration; native preview uses the original track. */
export const AUDIO_VALIDATION_SAMPLE_RATE = 22050
