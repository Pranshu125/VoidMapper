/**
 * VOID MAPPER // DATA HARVESTER & DETERMINISTIC AURA TRANSLATION ENGINE
 *
 * Queries the public GitHub REST API v3:
 *  1. /repos/{owner}/{repo}
 *  2. /repos/{owner}/{repo}/languages
 *  3. /repos/{owner}/{repo}/commits
 *
 * Implements sessionStorage caching to prevent unauthenticated rate-limiting
 * (60 requests/hour) and deterministically maps repository telemetry into
 * Three.js geometry, material, physics, and post-processing properties.
 */

const GITHUB_API_BASE = 'https://api.github.com';
const SESSION_CACHE_PREFIX = 'void_mapper_aura_v1:';

/**
 * Deterministic monochromatic grayscale mapping table for common languages.
 * Per Charter Section III: "Determines base material grayscale tone. Maps
 * standard language dominance to stark whites, grays, or deep blacks."
 */
const LANGUAGE_TONE_MAP = {
  TypeScript: { luma: 0.92, label: 'STARK TITANIUM WHITE' },
  JavaScript: { luma: 0.84, label: 'BRUSHED PLATINUM' },
  Rust: { luma: 0.68, label: 'FORGED STEEL GRAY' },
  Python: { luma: 0.76, label: 'STERLING SILVER' },
  Go: { luma: 0.88, label: 'ALABASTER CHROME' },
  'C++': { luma: 0.42, label: 'GUNMETAL GRAPHITE' },
  C: { luma: 0.30, label: 'CARBON SLATE' },
  GLSL: { luma: 0.96, label: 'PURE LUMINOUS QUARTZ' },
  WGSL: { luma: 0.94, label: 'SPECTRAL WHITE' },
  HTML: { luma: 0.72, label: 'PALE PEWTER' },
  CSS: { luma: 0.64, label: 'ARCHITECTURAL ZINC' },
  Java: { luma: 0.54, label: 'WEATHERED IRON' },
  Kotlin: { luma: 0.62, label: 'NICKEL ALLOY' },
  Swift: { luma: 0.80, label: 'ANODIZED ALUMINUM' },
  Shell: { luma: 0.24, label: 'OBSIDIAN CHARCOAL' },
  Ruby: { luma: 0.58, label: 'SMOKED SILVER' },
  PHP: { luma: 0.48, label: 'LEADEN GRAY' },
  CSharp: { luma: 0.50, label: 'TEMPERED MONOLITH' },
  'C#': { luma: 0.50, label: 'TEMPERED MONOLITH' },
};

/**
 * Clamps a numeric value between min and max.
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Converts a normalized [0, 1] luminance value into a 6-digit hex grayscale string.
 */
function lumaToHex(luma) {
  const channel = clamp(Math.round(luma * 255), 10, 255);
  const hex = channel.toString(16).padStart(2, '0');
  return `#${hex}${hex}${hex}`;
}

/**
 * Deterministic string hash in [0, 1] for fallback language tone calculation.
 */
function deterministicStringLuma(str = '') {
  if (!str) return 0.75;
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const normalized = (hash >>> 0) / 4294967295;
  return 0.22 + normalized * 0.72;
}

/**
 * Parses a GitHub repository URL or "owner/repo" shorthand into { owner, repo, slug }.
 * Supports inputs such as:
 *  - "https://github.com/Pranshu125/J.A.R.V.I.S"
 *  - "github.com/mrdoob/three.js"
 *  - "pmndrs/react-three-fiber"
 */
export function parseRepositoryInput(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') {
    return null;
  }

  const trimmed = rawInput.trim().replace(/\/+$/, '');
  if (!trimmed) return null;

  // Strip protocol and github.com prefix if present
  const cleaned = trimmed
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/^(www\.)?github\.com\//i, '')
    .replace(/\.git$/i, '');

  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length < 2) {
    return null;
  }

  const [owner, repo] = parts;
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) {
    return null;
  }

  return {
    owner,
    repo,
    slug: `${owner}/${repo}`,
  };
}

/**
 * Extracts total page count from a GitHub API HTTP Link header if present.
 * Allows estimating total commit count across large repositories in 1 request.
 */
function extractLastPageFromLinkHeader(linkHeader) {
  if (!linkHeader) return null;
  const lastMatch = linkHeader.match(/<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="last"/i);
  if (lastMatch && lastMatch[1]) {
    const parsed = parseInt(lastMatch[1], 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Translates raw GitHub telemetry into a normalized AuraState object.
 * Strictly implements Section III: Data-to-Aura Mapping Engine.
 */
export function normalizeToAuraState({
  owner,
  repo,
  repoMeta,
  languagesMap,
  commitsList,
  estimatedTotalCommits,
  source = 'live',
}) {
  const now = Date.now();
  const createdAtDate = repoMeta?.created_at ? new Date(repoMeta.created_at) : new Date(now - 180 * 86400000);
  const ageInMs = Math.max(0, now - createdAtDate.getTime());
  const ageInDays = Math.max(1, Math.round(ageInMs / (1000 * 60 * 60 * 24)));
  const ageInYears = Number((ageInDays / 365.25).toFixed(2));

  // 1. TOTAL COMMITS -> Vertex Density & Segment Geometry
  // Outliers (10,000+ commits) are logarithmically clamped to detail <= 14
  // so the WebGL context stays rock-solid at 60fps while visibly increasing poly density.
  const rawCommitCount = Math.max(
    1,
    estimatedTotalCommits || (Array.isArray(commitsList) ? commitsList.length : 1)
  );
  const commitLog = Math.log10(rawCommitCount + 1); // ~0.3 (1 commit) to ~4.5 (30k commits)
  const normalizedCommitDensity = clamp(commitLog / 4.2, 0.08, 1.0);

  // IcosahedronGeometry detail: 1 (80 tris, faceted) -> 14 (high-poly smooth sphere)
  const icosahedronDetail = clamp(Math.round(1 + normalizedCommitDensity * 13), 1, 14);
  const wireframeDetail = clamp(Math.round(1 + normalizedCommitDensity * 4), 1, 5);

  // Repository size (KB) modulates core artifact scale slightly
  const repoSizeKb = Math.max(1, repoMeta?.size || 512);
  const baseRadius = clamp(1.25 + Math.log10(repoSizeKb + 10) * 0.14, 1.35, 2.05);

  // 2. TOP LANGUAGES (/languages Bytes) -> Base Material Grayscale Tone
  const entries = Object.entries(languagesMap || {}).filter(([, bytes]) => typeof bytes === 'number' && bytes > 0);
  entries.sort((a, b) => b[1] - a[1]);

  const totalLanguageBytes = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  const languageBreakdown = entries.slice(0, 6).map(([name, bytes]) => ({
    name,
    bytes,
    share: totalLanguageBytes > 0 ? Number(((bytes / totalLanguageBytes) * 100).toFixed(1)) : 0,
  }));

  const dominantLanguage = languageBreakdown[0]?.name || repoMeta?.language || 'Unknown';
  const dominantLanguageShare = languageBreakdown[0]?.share ?? 100;

  const knownTone = LANGUAGE_TONE_MAP[dominantLanguage];
  const baseLuma = knownTone ? knownTone.luma : deterministicStringLuma(dominantLanguage);
  // Modulate luma subtly by language dominance share (pure monolith vs polyglot blend)
  const dominanceWeight = clamp(dominantLanguageShare / 100, 0.25, 1.0);
  const grayscaleTone = clamp(baseLuma * 0.85 + dominanceWeight * 0.15, 0.14, 0.96);

  const materialColor = lumaToHex(grayscaleTone);
  const wireframeColor = lumaToHex(clamp(grayscaleTone + 0.18, 0.35, 1.0));
  const emissiveTone = clamp(grayscaleTone * 0.38, 0.08, 0.42);
  const emissiveColor = lumaToHex(emissiveTone);

  // Higher dominance = higher metallic sheen; polyglot = slightly more brushed roughness
  const metalness = Number(clamp(0.55 + dominanceWeight * 0.35, 0.5, 0.92).toFixed(2));
  const roughness = Number(clamp(0.45 - dominanceWeight * 0.28, 0.14, 0.55).toFixed(2));

  // 3. OPEN ISSUES (open_issues_count) -> Vertex Noise / Chaos / Spiked Glitch
  const openIssuesCount = Math.max(0, repoMeta?.open_issues_count ?? 0);
  // Logarithmic chaos scaling: 0 issues = 0 chaos; 10 issues = ~0.35; 100 issues = ~0.68; 1000+ = 1.0
  const chaosFactor =
    openIssuesCount === 0
      ? 0
      : Number(clamp(Math.log10(openIssuesCount + 1) / 3.1, 0.05, 1.0).toFixed(3));

  const displacementAmplitude = Number((0.015 + chaosFactor * 0.46).toFixed(3));
  const spikeFrequency = Number((1.6 + chaosFactor * 4.8).toFixed(2));
  const glitchIntensity = Number((chaosFactor * chaosFactor).toFixed(3));

  // 4. REPOSITORY AGE (created_at vs Now) -> Rotational Velocity & Ambient Pulse Rate
  // Charter Section III: "Older repos rotate slowly; new ones spin rapidly."
  // Map age: 1 day -> maturity 0.0 (fast spin); 10+ years (3650 days) -> maturity 1.0 (slow monolithic spin)
  const ageMaturity = clamp(Math.log10(ageInDays + 1) / Math.log10(3650), 0, 1);
  const baseRotationSpeed = Number((1.15 - ageMaturity * 0.98).toFixed(3)); // 1.15 rad/s (new) -> 0.17 rad/s (ancient)
  // Chaos adds micro angular turbulence
  const rotationVelocity = Number((baseRotationSpeed + chaosFactor * 0.28).toFixed(3));
  const pulseFrequency = Number((2.4 - ageMaturity * 1.85 + chaosFactor * 0.45).toFixed(2));
  const pulseAmplitude = Number((0.02 + (1 - ageMaturity) * 0.045 + chaosFactor * 0.03).toFixed(3));

  // 5. POST-PROCESSING (Bloom & Film/Shader Noise)
  const bloomIntensity = Number(clamp(0.85 + grayscaleTone * 0.9 + chaosFactor * 0.35, 0.8, 2.2).toFixed(2));
  const bloomThreshold = Number(clamp(0.32 - grayscaleTone * 0.14, 0.12, 0.38).toFixed(2));
  const postNoiseOpacity = Number(clamp(0.035 + chaosFactor * 0.09, 0.035, 0.14).toFixed(3));

  const latestCommitItem = Array.isArray(commitsList) && commitsList[0] ? commitsList[0] : null;
  const latestCommit = latestCommitItem
    ? {
        sha: (latestCommitItem.sha || '').slice(0, 7),
        message: (latestCommitItem.commit?.message || '').split('\n')[0].slice(0, 72),
        author:
          latestCommitItem.commit?.author?.name ||
          latestCommitItem.author?.login ||
          owner,
        date: latestCommitItem.commit?.author?.date || repoMeta?.pushed_at || null,
      }
    : null;

  // Approximate triangle count of icosahedron at detail D: 20 * (D + 1)^2
  const estimatedTriangles = 20 * Math.pow(icosahedronDetail + 1, 2);
  const estimatedVertices = 10 * Math.pow(icosahedronDetail + 1, 2) + 2;

  return {
    owner,
    repo,
    fullName: repoMeta?.full_name || `${owner}/${repo}`,
    description:
      repoMeta?.description ||
      'Autonomous telemetry projection rendered inside the Void Mapper digital museum.',
    htmlUrl: repoMeta?.html_url || `https://github.com/${owner}/${repo}`,
    defaultBranch: repoMeta?.default_branch || 'main',
    stars: repoMeta?.stargazers_count ?? 0,
    forks: repoMeta?.forks_count ?? 0,
    watchers: repoMeta?.watchers_count ?? 0,
    sizeKb: repoSizeKb,
    openIssuesCount,
    totalCommits: rawCommitCount,
    createdAt: createdAtDate.toISOString(),
    updatedAt: repoMeta?.updated_at || createdAtDate.toISOString(),
    ageInDays,
    ageInYears,
    languages: {
      dominant: dominantLanguage,
      dominantShare: dominantLanguageShare,
      toneClassification: knownTone?.label || 'MONOCHROME ALLOY',
      totalBytes: totalLanguageBytes,
      breakdown: languageBreakdown,
    },
    latestCommit,
    aura: {
      icosahedronDetail,
      wireframeDetail,
      estimatedTriangles,
      estimatedVertices,
      baseRadius,
      grayscaleTone: Number(grayscaleTone.toFixed(3)),
      materialColor,
      wireframeColor,
      emissiveColor,
      emissiveIntensity: Number((0.18 + grayscaleTone * 0.25).toFixed(2)),
      metalness,
      roughness,
      chaosFactor,
      displacementAmplitude,
      spikeFrequency,
      glitchIntensity,
      rotationVelocity,
      pulseFrequency,
      pulseAmplitude,
      bloomIntensity,
      bloomThreshold,
      postNoiseOpacity,
    },
    meta: {
      source,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Generates a deterministic synthetic AuraState if the user is offline or hits
 * GitHub's 60 req/hr unauthenticated rate limit, ensuring the 3D museum never fails.
 */
export function buildSyntheticAuraState(owner, repo, reason = 'synthetic') {
  const seed = `${owner}/${repo}`;
  const luma = deterministicStringLuma(seed);
  const hashNum = Math.round(luma * 1000);
  const syntheticCommits = 45 + (hashNum % 1800);
  const syntheticIssues = hashNum % 64;
  const syntheticAgeDays = 30 + ((hashNum * 17) % 2400);
  const syntheticCreatedAt = new Date(Date.now() - syntheticAgeDays * 86400000).toISOString();

  const syntheticLanguages =
    luma > 0.8
      ? { JavaScript: 68400, GLSL: 18200, CSS: 6400 }
      : luma > 0.6
      ? { TypeScript: 92000, JavaScript: 24000, HTML: 4200 }
      : { Rust: 74000, C: 21000, Shell: 3500 };

  return normalizeToAuraState({
    owner,
    repo,
    repoMeta: {
      full_name: `${owner}/${repo}`,
      description:
        reason === 'rate_limit'
          ? 'GitHub API unauthenticated rate-limit reached — rendering deterministic procedural signature.'
          : 'Procedural genesis artifact initialized inside the Void Mapper chamber.',
      html_url: `https://github.com/${owner}/${repo}`,
      stargazers_count: (hashNum * 7) % 4500,
      forks_count: (hashNum * 2) % 600,
      size: 1280 + hashNum * 12,
      open_issues_count: syntheticIssues,
      created_at: syntheticCreatedAt,
      updated_at: new Date().toISOString(),
    },
    languagesMap: syntheticLanguages,
    commitsList: [
      {
        sha: '7f0a91c4b2e8d',
        commit: {
          message: 'Initialize Void Mapper procedural geometry and WebGL core',
          author: {
            name: owner,
            date: new Date().toISOString(),
          },
        },
      },
    ],
    estimatedTotalCommits: syntheticCommits,
    source: reason,
  });
}

/**
 * Initial default state rendered immediately on boot before user query.
 */
export const INITIAL_AURA_STATE = normalizeToAuraState({
  owner: 'pmndrs',
  repo: 'react-three-fiber',
  repoMeta: {
    full_name: 'pmndrs/react-three-fiber',
    description: 'A React renderer for Three.js — initial reference monolith in the Void Mapper.',
    html_url: 'https://github.com/pmndrs/react-three-fiber',
    stargazers_count: 27800,
    forks_count: 1620,
    size: 18420,
    open_issues_count: 18,
    created_at: '2019-02-27T16:00:00Z',
    updated_at: new Date().toISOString(),
  },
  languagesMap: {
    TypeScript: 412800,
    JavaScript: 38400,
    HTML: 4100,
  },
  commitsList: [
    {
      sha: '9a8b7c6',
      commit: {
        message: 'feat(webgl): declarative scene graph & post-processing pipeline',
        author: { name: 'pmndrs', date: new Date().toISOString() },
      },
    },
  ],
  estimatedTotalCommits: 1640,
  source: 'genesis',
});

/**
 * Reads cached AuraState from browser sessionStorage if available.
 */
function readSessionCache(slug) {
  try {
    const key = `${SESSION_CACHE_PREFIX}${slug.toLowerCase()}`;
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.aura && parsed.fullName) {
      return {
        ...parsed,
        meta: {
          ...parsed.meta,
          source: 'session_cache',
        },
      };
    }
  } catch {
    // Ignore storage access errors in restricted contexts
  }
  return null;
}

/**
 * Writes normalized AuraState into browser sessionStorage.
 */
function writeSessionCache(slug, auraState) {
  try {
    const key = `${SESSION_CACHE_PREFIX}${slug.toLowerCase()}`;
    window.sessionStorage.setItem(key, JSON.stringify(auraState));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Primary Harvester Function:
 * Queries /repos/{owner}/{repo}, /languages, and /commits concurrently,
 * caches results in sessionStorage, and returns the normalized AuraState.
 */
export async function fetchRepositoryData(input, { signal, bypassCache = false } = {}) {
  const parsed = parseRepositoryInput(input);
  if (!parsed) {
    throw new Error('Invalid format. Enter "owner/repo" or a full GitHub repository URL.');
  }

  const { owner, repo, slug } = parsed;

  if (!bypassCache) {
    const cached = readSessionCache(slug);
    if (cached) {
      return cached;
    }
  }

  const headers = {
    Accept: 'application/vnd.github.v3+json',
  };

  const repoUrl = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const languagesUrl = `${repoUrl}/languages`;
  const commitsUrl = `${repoUrl}/commits?per_page=100`;

  const [repoRes, langRes, commitsRes] = await Promise.all([
    fetch(repoUrl, { headers, signal }),
    fetch(languagesUrl, { headers, signal }),
    fetch(commitsUrl, { headers, signal }),
  ]);

  if (repoRes.status === 404) {
    throw new Error(`Repository "${slug}" not found or is private.`);
  }

  if (repoRes.status === 403 || repoRes.status === 429) {
    // Graceful fallback when GitHub unauthenticated rate limit is exhausted
    const synthetic = buildSyntheticAuraState(owner, repo, 'rate_limit');
    writeSessionCache(slug, synthetic);
    return synthetic;
  }

  if (!repoRes.ok) {
    throw new Error(`GitHub API error (${repoRes.status}) while harvesting ${slug}.`);
  }

  const repoMeta = await repoRes.json();
  const languagesMap = langRes.ok ? await langRes.json() : {};
  const commitsList = commitsRes.ok ? await commitsRes.json() : [];

  // Determine total commit volume from Link pagination header or array length
  const linkHeader = commitsRes.headers.get('Link');
  const lastPage = extractLastPageFromLinkHeader(linkHeader);
  const arrayCount = Array.isArray(commitsList) ? commitsList.length : 0;
  const estimatedTotalCommits =
    lastPage && lastPage > 1 ? (lastPage - 1) * 100 + Math.min(arrayCount, 100) : Math.max(1, arrayCount);

  const normalized = normalizeToAuraState({
    owner: repoMeta.owner?.login || owner,
    repo: repoMeta.name || repo,
    repoMeta,
    languagesMap,
    commitsList: Array.isArray(commitsList) ? commitsList : [],
    estimatedTotalCommits,
    source: 'github_api',
  });

  writeSessionCache(slug, normalized);
  return normalized;
}
