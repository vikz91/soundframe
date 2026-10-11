'use client'

import { ArrowsOutSimpleIcon } from '@phosphor-icons/react'
import { EditorShell } from '@/components/audioframe/editor-shell'
import { PlaybackControls } from '@/components/audioframe/playback-controls'
import { PreviewFrame } from '@/components/audioframe/preview-frame'
import { ColourPicker, ModePicker, RangeField, TypefaceSelect } from '@/components/audioframe/style-controls'
import { LyricsControls, SongDetailsFields } from '@/components/audioframe/text-controls'
import { Button } from '@/components/ui/button'
import { PresetActions } from '@/components/audioframe/preset-actions'
import { Notice } from '@/components/audioframe/status'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { accentColours, backgroundColours } from '@/lib/audioframe-design'
import { canCreate } from '@/lib/prototype/controller'
import { sampleLrc } from '@/lib/prototype/fixtures'
import { SampleComposition } from './sample-composition'
import type { EditorViewProps } from './types'

export function EditorView({ state, actions, header, footer }: EditorViewProps) {
  const preferences = state.preferences
  const disabled = !canCreate(state) || state.export.status === 'running'
  const inspector = (
    <div className="rounded-panel border bg-card p-4 shadow-panel sm:p-5">
      <h2 className="mb-4 font-heading text-lg font-semibold">Make it yours</h2>
      <Tabs
        value={state.inspectorTab}
        onValueChange={(value: unknown) => {
          if (value === 'style' || value === 'text' || value === 'lyrics') actions.setInspectorTab(value)
        }}
      >
        <TabsList className="w-full" aria-label="Composition settings">
          <TabsTrigger value="style">Style</TabsTrigger>
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="lyrics">Lyrics</TabsTrigger>
        </TabsList>
        <TabsContent value="style" className="space-y-6 pt-5">
          <ModePicker
            value={preferences.mode}
            onValueChange={(mode) => actions.updatePreferences({ mode })}
            disabled={disabled}
          />
          <ColourPicker
            label="Accent colour"
            options={accentColours}
            value={preferences.accent}
            onValueChange={(accent) => actions.updatePreferences({ accent })}
            disabled={disabled}
          />
          <ColourPicker
            label="Background"
            options={backgroundColours}
            value={preferences.background}
            onValueChange={(background) => actions.updatePreferences({ background })}
            disabled={disabled}
          />
          <RangeField
            label="Sensitivity"
            value={preferences.sensitivity}
            onValueChange={(sensitivity) => actions.updatePreferences({ sensitivity })}
            hint="Adjusts the sample visual intensity. No audio is analysed."
            disabled={disabled}
          />
          <TypefaceSelect
            value={preferences.typography}
            onValueChange={(typography) => actions.updatePreferences({ typography })}
            disabled={disabled}
          />
        </TabsContent>
        <TabsContent value="text" className="pt-5">
          <SongDetailsFields
            value={preferences.details}
            onValueChange={(details) => actions.updatePreferences({ details })}
            disabled={disabled}
          />
        </TabsContent>
        <TabsContent value="lyrics" className="space-y-4 pt-5">
          <LyricsControls
            mode={preferences.lyricsMode}
            onModeChange={(lyricsMode) => actions.updatePreferences({ lyricsMode })}
            text={preferences.lyricsText}
            onTextChange={(lyricsText) =>
              actions.updatePreferences({
                lyricsText,
                lyricsFilename: lyricsText ? preferences.lyricsFilename : undefined
              })
            }
            onFileChange={() => {}}
            onChooseRequest={() => actions.setDialog('lyrics')}
            filename={preferences.lyricsFilename}
            error={state.lyricsError}
            disabled={disabled}
          />
          <p className="text-xs leading-5 text-muted-foreground">
            {preferences.lyricsMode === 'lrc' && preferences.lyricsText === sampleLrc
              ? 'The supplied sample cues follow the simulated clock at 0:00, 0:12, and 0:24.'
              : 'Edited lyrics appear as static text. This prototype does not parse or synchronise custom LRC.'}
          </p>
        </TabsContent>
      </Tabs>
      <div className="mt-6 space-y-3 border-t pt-5">
        <PresetActions
          onImport={() => {}}
          onImportRequest={() => actions.setDialog('preset')}
          onExport={actions.simulateSettingsExport}
          disabled={disabled}
        />
        {state.settingsError ? <Notice tone="danger" title={state.settingsError} /> : null}
      </div>
    </div>
  )

  return (
    <EditorShell header={header} inspector={inspector} footer={footer}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-section-title font-semibold tracking-tight">Create your frame</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Choose a style, add your words, and try the sample preview.
            </p>
          </div>
          <Button variant="outline" onClick={() => actions.setDialog('preview')}>
            <ArrowsOutSimpleIcon aria-hidden="true" />
            Expand preview
          </Button>
        </div>
        <PreviewFrame
          label="Sample preview"
          controls={
            <PlaybackControls
              playing={state.playback.playing}
              currentTime={state.playback.currentTime}
              duration={state.audio.sample?.duration ?? 222}
              volume={state.playback.volume}
              onPlayPause={actions.togglePlayback}
              onSeek={actions.seek}
              onVolumeChange={actions.setVolume}
              disabled={disabled}
            />
          }
        >
          <SampleComposition
            preferences={preferences}
            currentTime={state.playback.currentTime}
            playing={state.playback.playing}
          />
        </PreviewFrame>
        <p className="text-xs leading-5 text-muted-foreground">
          Playback advances a simulated clock. No audio plays; the volume control is illustrative. Reduced motion keeps
          the visual treatment static.
        </p>
        <div className="grid gap-3 rounded-control border bg-muted/40 p-4 text-xs sm:grid-cols-2">
          <div className="min-w-0">
            <span className="block font-medium">Audio sample</span>
            <span className="mt-1 block break-all text-muted-foreground">
              {state.audio.sample?.filename ?? 'No sample selected'}
            </span>
          </div>
          <div className="min-w-0">
            <span className="block font-medium">Artwork sample</span>
            <span className="mt-1 block break-all text-muted-foreground">
              {state.artwork.sample?.filename ?? 'No sample selected'}
            </span>
          </div>
        </div>
      </div>
    </EditorShell>
  )
}
