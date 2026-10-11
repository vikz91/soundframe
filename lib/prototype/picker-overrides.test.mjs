import { expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MediaFileCard } from '../../components/audioframe/media-file-card'
import { PresetActions } from '../../components/audioframe/preset-actions'
import { LyricsControls } from '../../components/audioframe/text-controls'

test('sample intents omit native picker inputs while default consumers retain them', () => {
  const noop = () => {}
  const examples = [
    [MediaFileCard, { kind: 'audio', onFileChange: noop }, { onChooseRequest: noop }],
    [PresetActions, { onImport: noop, onExport: noop }, { onImportRequest: noop }],
    [
      LyricsControls,
      { mode: 'lrc', onModeChange: noop, text: '', onTextChange: noop, onFileChange: noop },
      { onChooseRequest: noop }
    ]
  ]
  for (const [Component, props, override] of examples) {
    expect(renderToStaticMarkup(createElement(Component, props))).toContain('type="file"')
    expect(renderToStaticMarkup(createElement(Component, { ...props, ...override }))).not.toContain('type="file"')
  }
})
