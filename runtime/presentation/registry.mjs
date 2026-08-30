export const PRESENTATION_TYPES = Object.freeze([
  'text', 'callout', 'comparison', 'diagram',
  'architecture-map', 'workflow', 'sequence', 'dataflow', 'lifecycle',
  'timeline', 'graph', 'simulation', 'data-visualization'
]);

export const TRUST_LEVELS = Object.freeze([
  'builtin', 'originator-approved', 'consumer-local', 'untrusted'
]);

export const EXECUTION_MODES = Object.freeze([
  'embedded', 'personal-agent', 'consumer-local'
]);

const DEFAULT_CAPABILITIES = Object.freeze([
  Object.freeze({
    id: 'explain-him-safe-text',
    provider: 'explain-him',
    trust: 'builtin',
    execution: 'embedded',
    accepts: [...PRESENTATION_TYPES],
    fallback: true,
    description: 'Safe text fallback rendered by Explain Him with textContent.'
  }),
  Object.freeze({
    id: 'explain-him-safe-block',
    provider: 'explain-him',
    trust: 'builtin',
    execution: 'embedded',
    accepts: ['callout', 'comparison', 'workflow', 'timeline', 'diagram'],
    fallback: false,
    description: 'Safe typed explanation blocks rendered from structured data without arbitrary HTML or JavaScript.'
  }),
  Object.freeze({
    id: 'archify',
    provider: 'github:tt-a1i/archify',
    trust: 'originator-approved',
    execution: 'personal-agent',
    accepts: ['architecture-map', 'workflow', 'sequence', 'dataflow', 'lifecycle'],
    fallback: false,
    description: 'Agent-side technical visualization; generated HTML is never injected into the Explain Him page.'
  })
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function getDefaultPresentationCapabilities() {
  return clone(DEFAULT_CAPABILITIES);
}

export function getPresentationCapability(id, capabilities = DEFAULT_CAPABILITIES) {
  return capabilities.find((capability) => capability.id === id) || null;
}

export function isCapabilityUseAllowed(capability, { insideAuthoredSurface = false } = {}) {
  if (!capability) return false;
  if (!TRUST_LEVELS.includes(capability.trust)) return false;
  if (!EXECUTION_MODES.includes(capability.execution)) return false;
  if (capability.trust === 'untrusted') return false;
  if (insideAuthoredSurface && capability.execution === 'consumer-local') return false;
  if (insideAuthoredSurface && capability.execution === 'embedded'
      && !['builtin', 'originator-approved'].includes(capability.trust)) return false;
  return true;
}

export function resolvePresentationCapability({
  type,
  requestedCapabilityId = null,
  availableCapabilityIds = null,
  capabilities = DEFAULT_CAPABILITIES
} = {}) {
  if (!PRESENTATION_TYPES.includes(type)) throw new TypeError(`Unsupported presentation type: ${type}`);
  const available = availableCapabilityIds ? new Set(availableCapabilityIds) : null;
  const candidates = capabilities.filter((capability) => {
    if (!capability.accepts?.includes(type)) return false;
    if (available && !available.has(capability.id)) return false;
    return isCapabilityUseAllowed(capability);
  });

  if (requestedCapabilityId) {
    const requested = candidates.find((capability) => capability.id === requestedCapabilityId);
    if (requested) return clone(requested);
  }

  const specialized = candidates.find((capability) => !capability.fallback);
  if (specialized) return clone(specialized);
  const fallback = candidates.find((capability) => capability.fallback);
  return fallback ? clone(fallback) : null;
}
