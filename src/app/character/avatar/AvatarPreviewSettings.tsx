/**
 * AvatarPreviewSettings — permanent viewport gear: Darstellung + LiveAct (#330, #331).
 * Location: src/app/character/avatar/AvatarPreviewSettings.tsx
 *
 * Always openable in editor Surface chrome (even fallback „CH“).
 * LiveAct/MToon actions stay disabled without 3D runtime — no camera prompt.
 */

import { useEffect, useRef, useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '../../../shared/ui/button';
import { Switch } from '../../../shared/ui/switch';
import type { LiveActCameraDeviceOption } from '../liveact/useLiveActViewport';
import type {
  LiveActCapabilitiesV1,
  LiveActStatus,
} from '../../../domains/character/liveact';
import { LiveActCapabilityInspector } from '../liveact/LiveActCapabilityInspector';

interface AvatarPreviewSettingsProps {
  /** False = no 3D runtime — actions disabled, gear still openable. */
  runtimeReady: boolean;
  mtoonEnabled: boolean;
  onMtoonChange: (enabled: boolean) => void;
  trackingEnabled: boolean;
  onTrackingChange: (enabled: boolean) => void;
  cameraPreviewEnabled: boolean;
  onCameraPreviewChange: (enabled: boolean) => void;
  faceOverlayEnabled: boolean;
  onFaceOverlayChange: (enabled: boolean) => void;
  /** Loaded model exposes SagaDriveFaceAnchorsV1 sidecar (#400). */
  characterFaceMappingAvailable: boolean;
  metricsEnabled: boolean;
  onMetricsChange: (enabled: boolean) => void;
  bonesEnabled: boolean;
  bonesAvailable: boolean;
  onBonesChange: (enabled: boolean) => void;
  capabilities: LiveActCapabilitiesV1 | null;
  inputLive: boolean;
  devices: readonly LiveActCameraDeviceOption[];
  selectedDeviceId: string | undefined;
  onDeviceChange: (deviceId: string | undefined) => void;
  status: LiveActStatus;
  statusMessage: string;
  faceDetected: boolean;
  headConnected: boolean;
  eyesConnected: boolean;
  mouthLimited: boolean;
  canCalibrate: boolean;
  onCalibrate: () => void;
  calibrationMessage: string;
  hasNeutralBaseline: boolean;
}

export function AvatarPreviewSettings({
  runtimeReady,
  mtoonEnabled,
  onMtoonChange,
  trackingEnabled,
  onTrackingChange,
  cameraPreviewEnabled,
  onCameraPreviewChange,
  faceOverlayEnabled,
  onFaceOverlayChange,
  characterFaceMappingAvailable,
  metricsEnabled,
  onMetricsChange,
  bonesEnabled,
  bonesAvailable,
  onBonesChange,
  capabilities,
  inputLive,
  devices,
  selectedDeviceId,
  onDeviceChange,
  status,
  statusMessage,
  faceDetected,
  headConnected,
  eyesConnected,
  mouthLimited,
  canCalibrate,
  onCalibrate,
  calibrationMessage,
  hasNeutralBaseline,
}: AvatarPreviewSettingsProps) {
  const [open, setOpen] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const actionsDisabled = !runtimeReady;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const host = hostRef.current;
      if (!host) return;
      if (event.target instanceof Node && host.contains(event.target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={hostRef}
      className="pointer-events-auto absolute right-3 top-3 z-20"
      data-avatar-preview-settings-host="true"
    >
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label="Avatar-Vorschau Einstellungen"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Vorschau-Einstellungen"
        data-testid="avatar-preview-settings"
        className="h-8 w-8 border-white/15 bg-black/50 p-0 text-slate-100 backdrop-blur-sm hover:bg-black/65"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Settings className="size-3.5" aria-hidden />
      </Button>

      {open ? (
        <div
          role="menu"
          data-testid="avatar-preview-settings-menu"
          className="absolute right-0 top-full z-30 mt-1 max-h-[min(70vh,28rem)] w-64 overflow-y-auto rounded-md border border-white/15 bg-slate-950 p-2 text-slate-100 shadow-lg"
        >
          <p className="px-1 pb-1 text-[11px] font-medium text-slate-300">3D Vorschau</p>

          {!runtimeReady ? (
            <p
              className="mb-2 rounded-sm bg-amber-400/10 px-2 py-1.5 text-[10px] text-amber-100"
              data-testid="avatar-preview-runtime-hint"
              role="status"
            >
              3D-Modell erforderlich — Darstellung und LiveAct sind deaktiviert.
            </p>
          ) : null}

          <p className="px-1 pb-1 text-[11px] font-medium text-slate-300">Darstellung</p>
          <div
            className="flex items-center justify-between gap-3 rounded-sm px-1 py-1.5"
            data-testid="avatar-mtoon-toggle"
          >
            <div className="min-w-0">
              <p className="text-xs text-slate-100">MToon</p>
              <p className="text-[10px] text-slate-400">
                {mtoonEnabled ? 'An — stilisiert' : 'Aus — PBR roh'}
              </p>
            </div>
            <Switch
              checked={mtoonEnabled}
              disabled={actionsDisabled}
              onCheckedChange={onMtoonChange}
              aria-label={mtoonEnabled ? 'MToon-Stil ausschalten' : 'MToon-Stil einschalten'}
            />
          </div>

          <div className="mt-2 border-t border-white/10 pt-2">
            <p className="px-1 pb-1 text-[11px] font-medium text-slate-300">LiveAct</p>

            <div className="flex items-center justify-between gap-3 rounded-sm px-1 py-1.5">
              <div className="min-w-0">
                <p className="text-xs text-slate-100">Tracking</p>
                <p className="text-[10px] text-slate-400">Webcam → Avatar</p>
              </div>
              <Switch
                checked={trackingEnabled}
                disabled={actionsDisabled}
                onCheckedChange={onTrackingChange}
                aria-label={
                  trackingEnabled ? 'LiveAct Tracking ausschalten' : 'LiveAct Tracking einschalten'
                }
                data-testid="liveact-tracking-toggle"
              />
            </div>

            <div className="px-1 py-1.5">
              <label className="text-xs text-slate-100" htmlFor="liveact-camera-select">
                Kamera
              </label>
              <select
                id="liveact-camera-select"
                data-testid="liveact-camera-select"
                className="mt-1 w-full rounded border border-white/15 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 disabled:opacity-50"
                disabled={actionsDisabled || !trackingEnabled}
                value={selectedDeviceId ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  onDeviceChange(value || undefined);
                }}
              >
                <option value="">
                  {devices.length === 0 ? 'Standardkamera' : 'Kamera wählen'}
                </option>
                {devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-sm px-1 py-1.5">
              <div className="min-w-0">
                <p className="text-xs text-slate-100">Kameravorschau</p>
                <p className="text-[10px] text-slate-400">PiP im Viewport</p>
              </div>
              <Switch
                checked={cameraPreviewEnabled}
                disabled={actionsDisabled}
                onCheckedChange={onCameraPreviewChange}
                aria-label="Kameravorschau umschalten"
                data-testid="liveact-camera-preview-toggle"
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-sm px-1 py-1.5">
              <div className="min-w-0">
                <p className="text-xs text-slate-100">Face Overlay</p>
                <p className="text-[10px] text-slate-400">
                  Kamera-PiP + Character-Mesh (lokal)
                </p>
              </div>
              <Switch
                checked={faceOverlayEnabled}
                disabled={actionsDisabled || !trackingEnabled}
                onCheckedChange={onFaceOverlayChange}
                aria-label="Face Overlay umschalten"
                data-testid="liveact-face-overlay-toggle"
              />
            </div>

            {!characterFaceMappingAvailable && runtimeReady ? (
              <p
                className="px-1 pb-1 text-[10px] text-amber-200/90"
                data-testid="liveact-character-face-mapping-unavailable"
              >
                Character Face Mapping nicht verfügbar (kein face-anchors.json am Modell).
              </p>
            ) : null}

            <div className="flex items-center justify-between gap-3 rounded-sm px-1 py-1.5">
              <div className="min-w-0">
                <p className="text-xs text-slate-100">Metrics</p>
                <p className="text-[10px] text-slate-400">HUD in PiP + Character-Viewport</p>
              </div>
              <Switch
                checked={metricsEnabled}
                disabled={actionsDisabled || !trackingEnabled}
                onCheckedChange={onMetricsChange}
                aria-label="Face Metrics umschalten"
                data-testid="liveact-face-metrics-toggle"
              />
            </div>

            <div
              className="flex items-center justify-between gap-3 rounded-sm px-1 py-1.5"
              data-testid="liveact-bones-row"
            >
              <div className="min-w-0">
                <p className="text-xs text-slate-100">Character Bones</p>
                <p className="text-[10px] text-slate-400">
                  {bonesAvailable
                    ? 'Skelett des geladenen Modells'
                    : 'Kein Skelett im Modell'}
                </p>
              </div>
              <Switch
                checked={bonesEnabled}
                disabled={actionsDisabled || !bonesAvailable}
                onCheckedChange={onBonesChange}
                aria-label={
                  bonesAvailable
                    ? 'Character Bones umschalten'
                    : 'Character Bones (kein Skelett)'
                }
                data-testid="liveact-bones-toggle"
              />
            </div>

            <div className="mt-2 border-t border-white/10 pt-2">
              <p className="px-1 pb-1 text-[11px] font-medium text-slate-300">
                Capability Inspector
              </p>
              <LiveActCapabilityInspector
                capabilities={capabilities}
                inputLive={inputLive}
              />
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={actionsDisabled || !canCalibrate}
              className="mt-1 h-8 w-full border-white/15 text-xs"
              data-testid="liveact-calibrate"
              title={
                canCalibrate
                  ? 'Neutrale Gesichtspose für diese Sitzung speichern'
                  : 'Kalibrieren erfordert aktives Tracking'
              }
              onClick={onCalibrate}
            >
              Kalibrieren
            </Button>
            {calibrationMessage ? (
              <p className="mt-1 px-1 text-[10px] text-slate-400" role="status">
                {calibrationMessage}
              </p>
            ) : null}
            {hasNeutralBaseline ? (
              <p className="px-1 text-[10px] text-emerald-400/90">Neutral-Baseline aktiv (ephemeral)</p>
            ) : null}
          </div>

          <div className="mt-2 border-t border-white/10 pt-2" data-testid="liveact-status-block">
            <p className="px-1 pb-1 text-[11px] font-medium text-slate-300">Status</p>
            <ul className="space-y-0.5 px-1 text-[10px] text-slate-300">
              <li data-liveact-status-face={faceDetected ? 'yes' : 'no'}>
                Gesicht {faceDetected ? 'erkannt' : '—'}
              </li>
              <li data-liveact-status-head={headConnected ? 'yes' : 'no'}>
                Kopf {headConnected ? 'verbunden' : '—'}
              </li>
              <li data-liveact-status-eyes={eyesConnected ? 'yes' : 'no'}>
                Augen {eyesConnected ? 'verbunden' : '—'}
              </li>
              <li data-liveact-status-mouth={mouthLimited ? 'limited' : 'ok'}>
                Mund {mouthLimited ? 'eingeschränkt' : 'verbunden'}
              </li>
            </ul>
            <p className="mt-1 px-1 text-[10px] text-slate-400" role="status">
              {statusMessage} · {status}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
