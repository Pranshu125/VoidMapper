import React from 'react';

const PRESET_REPOSITORIES = [
  { label: 'pmndrs/react-three-fiber', slug: 'pmndrs/react-three-fiber' },
  { label: 'mrdoob/three.js', slug: 'mrdoob/three.js' },
  { label: 'facebook/react', slug: 'facebook/react' },
  { label: 'torvalds/linux', slug: 'torvalds/linux' },
  { label: 'Pranshu125/VoidMapper', slug: 'Pranshu125/VoidMapper' },
];

const RENDER_MODES = [
  { id: 'hybrid', label: 'HYBRID' },
  { id: 'monolith', label: 'MONOLITH' },
  { id: 'wireframe', label: 'WIREFRAME' },
];

/**
 * Minimalist Architectural Overlay HUD.
 * Strictly adheres to the Charter's "Aesthetic Protocol (The 'Vibe')":
 * No navbars, no footers, pure monochrome, floating unobtrusively over the 3D viewport.
 */
export default function MinimalOverlay({
  query,
  onQueryChange,
  onSubmit,
  onSelectPreset,
  auraState,
  isLoading,
  error,
  renderMode,
  onRenderModeChange,
  minimalMode,
  onToggleMinimalMode,
}) {
  const { aura, languages } = auraState;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-5 sm:p-8 void-vignette">
      {/* Top Floating Command Bar */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Input Field for GitHub URL / owner/repo */}
        <div className="pointer-events-auto w-full max-w-md">
          <form onSubmit={onSubmit} className="relative">
            <div className="flex items-center bg-[#080808]/85 backdrop-blur-md hairline-border hairline-border-focus transition-all duration-300">
              <span className="pl-3.5 pr-2 font-mono text-[10px] tracking-widest text-neutral-500 select-none">
                GH://
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="owner/repo or https://github.com/..."
                aria-label="GitHub repository URL or owner/repo"
                spellCheck={false}
                autoComplete="off"
                className="w-full bg-transparent py-2.5 pr-3 font-mono text-xs text-white placeholder-neutral-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-3.5 py-2.5 font-mono text-[10px] tracking-widest uppercase text-neutral-300 hover:text-white hover:bg-white/5 border-l border-white/10 transition-colors disabled:opacity-40"
              >
                {isLoading ? 'SYNC...' : 'MAP'}
              </button>
            </div>
          </form>

          {/* Subtle Preset Selector Pills & Status */}
          {!minimalMode && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {PRESET_REPOSITORIES.map((preset) => {
                const isActive =
                  auraState.fullName.toLowerCase() === preset.slug.toLowerCase();
                return (
                  <button
                    key={preset.slug}
                    type="button"
                    onClick={() => onSelectPreset(preset.slug)}
                    className={`px-2 py-0.5 font-mono text-[10px] tracking-wider transition-all border ${
                      isActive
                        ? 'bg-white text-black border-white'
                        : 'bg-black/60 text-neutral-400 border-white/10 hover:border-white/35 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div className="mt-2 px-3 py-1.5 bg-black/90 border border-white/30 font-mono text-[11px] text-neutral-200">
              <span className="text-white font-semibold mr-1.5">[TELEMETRY FAULT]</span>
              {error}
            </div>
          )}
        </div>

        {/* Top-Right Shader / Material Mode & HUD Visibility Toggle */}
        <div className="pointer-events-auto flex items-center gap-2 self-end sm:self-auto">
          {!minimalMode && (
            <div className="flex items-center bg-[#080808]/85 backdrop-blur-md hairline-border p-0.5">
              {RENDER_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onRenderModeChange(mode.id)}
                  className={`px-2.5 py-1 font-mono text-[10px] tracking-widest transition-colors ${
                    renderMode === mode.id
                      ? 'bg-white text-black font-medium'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onToggleMinimalMode}
            title="Toggle Minimal Museum View"
            className="px-2.5 py-1.5 bg-[#080808]/85 backdrop-blur-md hairline-border font-mono text-[10px] tracking-widest text-neutral-400 hover:text-white hover:border-white/40 transition-colors"
          >
            {minimalMode ? 'HUD [OFF]' : 'HUD [ON]'}
          </button>
        </div>
      </div>

      {/* Bottom Minimalist Telemetry Readout (Hidden when HUD [OFF] is toggled) */}
      {!minimalMode && (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          {/* Left: Active Repository Signature */}
          <div className="pointer-events-auto max-w-md space-y-1.5">
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-neutral-400 uppercase">
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${
                  isLoading ? 'bg-white animate-ping' : 'bg-white'
                }`}
              />
              <span>AURA ARTIFACT // {auraState.fullName}</span>
              <span className="text-neutral-600">
                [{auraState.meta.source.toUpperCase()}]
              </span>
            </div>

            <p className="font-sans text-xs text-neutral-400 line-clamp-2 leading-relaxed">
              {auraState.description}
            </p>

            {/* Language Dominance Bar */}
            {languages.breakdown.length > 0 && (
              <div className="pt-1 space-y-1">
                <div className="flex h-0.5 w-full bg-neutral-900 overflow-hidden">
                  {languages.breakdown.map((lang, idx) => {
                    const shade = Math.max(25, 100 - idx * 20);
                    return (
                      <div
                        key={lang.name}
                        style={{
                          width: `${Math.max(lang.share, 2)}%`,
                          backgroundColor: `rgb(${shade}%, ${shade}%, ${shade}%)`,
                        }}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] text-neutral-400">
                  {languages.breakdown.slice(0, 4).map((lang) => (
                    <span key={lang.name}>
                      <span className="text-neutral-200">{lang.name}</span>{' '}
                      <span className="text-neutral-500">{lang.share}%</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: 4-Axis Charter Data-to-Aura Mapping Telemetry Matrix */}
          <div className="pointer-events-auto grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/10 hairline-border">
            <div className="bg-[#070707]/90 backdrop-blur-md px-3 py-2 min-w-[125px]">
              <div className="font-mono text-[9px] tracking-widest text-neutral-500 uppercase">
                01 / COMMITS
              </div>
              <div className="mt-0.5 font-mono text-sm text-white font-medium">
                {auraState.totalCommits.toLocaleString()}
              </div>
              <div className="font-mono text-[10px] text-neutral-400">
                SUBDIV: D{aura.icosahedronDetail} ({aura.estimatedTriangles.toLocaleString()} Δ)
              </div>
            </div>

            <div className="bg-[#070707]/90 backdrop-blur-md px-3 py-2 min-w-[125px]">
              <div className="font-mono text-[9px] tracking-widest text-neutral-500 uppercase">
                02 / DOMINANT LANG
              </div>
              <div className="mt-0.5 font-mono text-sm text-white font-medium truncate">
                {languages.dominant}
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-neutral-400">
                <span
                  className="inline-block w-2 h-2 border border-white/30"
                  style={{ backgroundColor: aura.materialColor }}
                />
                <span>LUMA {(aura.grayscaleTone * 100).toFixed(0)}%</span>
              </div>
            </div>

            <div className="bg-[#070707]/90 backdrop-blur-md px-3 py-2 min-w-[125px]">
              <div className="font-mono text-[9px] tracking-widest text-neutral-500 uppercase">
                03 / OPEN ISSUES
              </div>
              <div className="mt-0.5 font-mono text-sm text-white font-medium">
                {auraState.openIssuesCount.toLocaleString()}
              </div>
              <div className="font-mono text-[10px] text-neutral-400">
                CHAOS {(aura.chaosFactor * 100).toFixed(0)}% // AMP {aura.displacementAmplitude}
              </div>
            </div>

            <div className="bg-[#070707]/90 backdrop-blur-md px-3 py-2 min-w-[125px]">
              <div className="font-mono text-[9px] tracking-widest text-neutral-500 uppercase">
                04 / REPO AGE
              </div>
              <div className="mt-0.5 font-mono text-sm text-white font-medium">
                {auraState.ageInDays.toLocaleString()}d
              </div>
              <div className="font-mono text-[10px] text-neutral-400">
                SPIN {aura.rotationVelocity} rad/s
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
