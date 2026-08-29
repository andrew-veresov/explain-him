import {
  EXECUTION_MODES,
  PRESENTATION_TYPES,
  TRUST_LEVELS,
  getPresentationCapability,
  isCapabilityUseAllowed
} from './registry.mjs';

export const PRESENTATION_SCHEMA_VERSION = 'explain-him-presentation.v1';
const MAX_TITLE = 160;
const MAX_BODY = 5000;
const MAX_PAYLOAD_BYTES = 20000;
const DANGEROUS_KEYS = new Set(['html', 'innerhtml', 'outerhtml', 'srcdoc', 'script', 'javascript']);

function requireString(value, field, maxLength) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${field} must be a non-empty string`);
  if (value.length > maxLength) throw new RangeError(`${field} exceeds ${maxLength} characters`);
  return value.trim();
}

function assertSafePayload(value, path = 'content.payload') {
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) assertSafePayload(value[i], `${path}[${i}]`);
    return;
  }
  if (typeof value !== 'object') throw new TypeError(`${path} contains an unsupported value`);
  for (const [key, nested] of Object.entries(value)) {
    if (DANGEROUS_KEYS.has(key.toLowerCase())) throw new TypeError(`${path}.${key} is forbidden`);
    assertSafePayload(nested, `${path}.${key}`);
  }
}

function normalizeRefs(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((ref) => ({
    repository: typeof ref?.repository === 'string' ? ref.repository.slice(0, 200) : null,
    path: requireString(ref?.path, 'provenance.repositoryRefs.path', 500),
    ref: typeof ref?.ref === 'string' ? ref.ref.slice(0, 160) : null,
    section: typeof ref?.section === 'string' ? ref.section.slice(0, 300) : null,
    status: typeof ref?.status === 'string' ? ref.status.slice(0, 40) : null
  }));
}

export function createPresentationArtifact(input, { capabilities } = {}) {
  if (!input || typeof input !== 'object') throw new TypeError('presentation artifact must be an object');
  const type = requireString(input.type, 'type', 80);
  if (!PRESENTATION_TYPES.includes(type)) throw new TypeError(`Unsupported presentation type: ${type}`);

  const capabilityId = requireString(input.capability?.id, 'capability.id', 120);
  const registered = getPresentationCapability(capabilityId, capabilities);
  const trust = input.capability?.trust || registered?.trust;
  const execution = input.capability?.execution || registered?.execution;
  if (!TRUST_LEVELS.includes(trust)) throw new TypeError(`Unsupported capability trust: ${trust}`);
  if (!EXECUTION_MODES.includes(execution)) throw new TypeError(`Unsupported capability execution: ${execution}`);
  if (registered) {
    if (!registered.accepts.includes(type)) {
      throw new TypeError(`Capability ${capabilityId} does not accept ${type}`);
    }
    if (trust !== registered.trust || execution !== registered.execution) {
      throw new TypeError(`Capability ${capabilityId} trust/execution does not match the registry`);
    }
  } else if (!(trust === 'consumer-local' && execution === 'consumer-local')) {
    throw new TypeError(`Unknown capability ${capabilityId} is allowed only as consumer-local`);
  }
  if (!isCapabilityUseAllowed({ id: capabilityId, trust, execution })) {
    throw new TypeError(`Capability ${capabilityId} is not allowed`);
  }

  const contentSchema = requireString(input.content?.schema, 'content.schema', 160);
  const payload = input.content?.payload ?? {};
  assertSafePayload(payload);
  const serializedPayload = JSON.stringify(payload);
  const payloadBytes = globalThis.TextEncoder ? new TextEncoder().encode(serializedPayload).length : serializedPayload.length;
  if (payloadBytes > MAX_PAYLOAD_BYTES) throw new RangeError(`content.payload exceeds ${MAX_PAYLOAD_BYTES} bytes`);

  return {
    schemaVersion: PRESENTATION_SCHEMA_VERSION,
    type,
    capability: {
      id: capabilityId,
      version: typeof input.capability?.version === 'string' ? input.capability.version.slice(0, 80) : null,
      trust,
      execution
    },
    content: { schema: contentSchema, payload: JSON.parse(JSON.stringify(payload)) },
    fallback: {
      title: requireString(input.fallback?.title, 'fallback.title', MAX_TITLE),
      body: requireString(input.fallback?.body, 'fallback.body', MAX_BODY)
    },
    provenance: {
      sourceBlockIds: Array.isArray(input.provenance?.sourceBlockIds)
        ? input.provenance.sourceBlockIds.slice(0, 20).filter((item) => typeof item === 'string')
        : [],
      repositoryRefs: normalizeRefs(input.provenance?.repositoryRefs),
      conversationRef: typeof input.provenance?.conversationRef === 'string'
        ? input.provenance.conversationRef.slice(0, 300)
        : null
    },
    authorship: {
      meaning: typeof input.authorship?.meaning === 'string' ? input.authorship.meaning.slice(0, 80) : 'personal-agent',
      presentation: typeof input.authorship?.presentation === 'string'
        ? input.authorship.presentation.slice(0, 120)
        : capabilityId,
      requestedBy: ['originator', 'consumer', 'agent'].includes(input.authorship?.requestedBy)
        ? input.authorship.requestedBy
        : 'agent'
    }
  };
}

export function createSafeTextArtifact({ type = 'text', title, body, provenance = {}, requestedBy = 'agent' } = {}) {
  return createPresentationArtifact({
    type,
    capability: { id: 'explain-him-safe-text', trust: 'builtin', execution: 'embedded' },
    content: { schema: 'explain-him.safe-text.v1', payload: { text: body } },
    fallback: { title, body },
    provenance,
    authorship: { meaning: 'personal-agent', presentation: 'explain-him-safe-text', requestedBy }
  });
}
