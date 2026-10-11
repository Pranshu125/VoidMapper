import React, { useState, useEffect, useRef, useCallback } from 'react';
import AuraCanvas from './components/AuraCanvas';
import MinimalOverlay from './components/MinimalOverlay';
import {
  INITIAL_AURA_STATE,
  fetchRepositoryData,
  parseRepositoryInput,
} from './services/githubHarvester';

const DEBOUNCE_DELAY_MS = 650;

export default function App() {
  const [query, setQuery] = useState('pmndrs/react-three-fiber');
  const [auraState, setAuraState] = useState(INITIAL_AURA_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [renderMode, setRenderMode] = useState('hybrid');
  const [minimalMode, setMinimalMode] = useState(false);

  const abortControllerRef = useRef(null);
  const lastFetchedSlugRef = useRef('pmndrs/react-three-fiber');

  const executeHarvest = useCallback(async (targetInput, { force = false } = {}) => {
    const parsed = parseRepositoryInput(targetInput);
    if (!parsed) {
      if (force) {
        setError('Enter a valid "owner/repo" string or GitHub repository URL.');
      }
      return;
    }

    if (!force && parsed.slug.toLowerCase() === lastFetchedSlugRef.current.toLowerCase()) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const nextAura = await fetchRepositoryData(parsed.slug, {
        signal: controller.signal,
      });
      lastFetchedSlugRef.current = parsed.slug;
      setAuraState(nextAura);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Unable to harvest repository telemetry.');
    } finally {
      if (abortControllerRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, []);

  // Initial live harvest on mount + debounced auto-harvest when typing a valid owner/repo
  useEffect(() => {
    const parsed = parseRepositoryInput(query);
    if (!parsed) return undefined;

    const timer = window.setTimeout(() => {
      executeHarvest(query);
    }, DEBOUNCE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [query, executeHarvest]);

  const handleSubmit = (event) => {
    event.preventDefault();
    executeHarvest(query, { force: true });
  };

  const handleSelectPreset = (slug) => {
    setQuery(slug);
    executeHarvest(slug, { force: true });
  };

  return (
    <main className="relative w-screen h-screen bg-[#050505] text-white overflow-hidden select-none">
      {/* Full-Viewport 3D WebGL Aura Renderer */}
      <AuraCanvas auraState={auraState} renderMode={renderMode} />

      {/* Minimalist Architectural Overlay */}
      <MinimalOverlay
        query={query}
        onQueryChange={setQuery}
        onSubmit={handleSubmit}
        onSelectPreset={handleSelectPreset}
        auraState={auraState}
        isLoading={isLoading}
        error={error}
        renderMode={renderMode}
        onRenderModeChange={setRenderMode}
        minimalMode={minimalMode}
        onToggleMinimalMode={() => setMinimalMode((prev) => !prev)}
      />
    </main>
  );
}
