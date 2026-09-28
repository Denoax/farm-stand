import type { SoundscapeSnapshot } from '../audio/useSoundscape'

interface SoundControlsProps {
  snapshot: SoundscapeSnapshot
  onEnable: () => void
  onDisable: () => void
  onMusicChange: (enabled: boolean) => void
  onMusicLevelChange: (level: number) => void
}

export function SoundControls({ snapshot, onEnable, onDisable, onMusicChange, onMusicLevelChange }: SoundControlsProps) {
  return (
    <div className="sound-controls" data-sound-enabled={snapshot.enabled ? 'true' : 'false'} data-sound-status={snapshot.status}>
      <button
        type="button"
        className="sound-controls__master"
        aria-pressed={snapshot.enabled}
        data-opening-preserve="true"
        onClick={() => { if (snapshot.enabled) onDisable(); else void onEnable() }}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
          <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" />
          {snapshot.enabled
            ? <path d="M16 8.2c1.5 1.1 1.5 6.5 0 7.6M18.7 5.8c3 2.7 3 9.7 0 12.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            : <path d="m16.2 9 5 5m0-5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
        </svg>
        Sound {snapshot.enabled ? 'on' : 'off'}
      </button>
      {snapshot.enabled && <>
        <button
          type="button"
          className="sound-controls__music"
          aria-pressed={snapshot.musicEnabled}
          data-opening-preserve="true"
          onClick={() => void onMusicChange(!snapshot.musicEnabled)}
        >
          Music {snapshot.musicEnabled ? 'on' : 'off'}
        </button>
        {snapshot.musicEnabled && (
          <label className="sound-controls__level">
            <span className="visually-hidden">Music volume</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(snapshot.musicLevel * 100)}
              aria-label="Music volume"
              data-opening-preserve="true"
              onChange={(event) => onMusicLevelChange(Number(event.currentTarget.value) / 100)}
            />
          </label>
        )}
      </>}
      {snapshot.musicBlocked && <span className="visually-hidden" role="status">Music is waiting for another permitted interaction.</span>}
    </div>
  )
}
