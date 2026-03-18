const KNOWN_AI_SEQUENCE = ['01', '10', '17', '30', '240', '91'];

function normalizeGs1Text(rawText) {
  return String(rawText || '').replace(/\s+/g, '').trim();
}

function extractParenthesizedAIs(text) {
  const values = {};
  const normalized = normalizeGs1Text(text);
  const regex = /\((\d{2,3})\)([^()]+)/g;
  let match;

  while ((match = regex.exec(normalized))) {
    values[match[1]] = match[2];
  }

  return values;
}

function readUntilNextKnownAi(text, startIndex, allowedNextAis) {
  let bestIndex = text.length;

  for (const ai of allowedNextAis) {
    const candidateIndex = text.indexOf(ai, startIndex);
    if (candidateIndex !== -1 && candidateIndex < bestIndex) {
      bestIndex = candidateIndex;
    }
  }

  return {
    value: text.slice(startIndex, bestIndex),
    endIndex: bestIndex
  };
}

function extractSequentialAIs(text) {
  const normalized = normalizeGs1Text(text);
  const values = {};
  let index = 0;

  while (index < normalized.length) {
    const ai = KNOWN_AI_SEQUENCE.find((candidate) => normalized.startsWith(candidate, index));
    if (!ai) {
      break;
    }

    index += ai.length;

    if (ai === '01') {
      values[ai] = normalized.slice(index, index + 14);
      index += 14;
      continue;
    }

    if (ai === '17') {
      values[ai] = normalized.slice(index, index + 6);
      index += 6;
      continue;
    }

    const remainingAis = KNOWN_AI_SEQUENCE.filter((candidate) => candidate !== ai);
    const { value, endIndex } = readUntilNextKnownAi(normalized, index, remainingAis);
    values[ai] = value;
    index = endIndex;
  }

  return values;
}

function parseExpiryDateYYMMDD(value) {
  if (!/^\d{6}$/.test(value || '')) {
    return null;
  }

  const yy = Number(value.slice(0, 2));
  const mm = value.slice(2, 4);
  const dd = value.slice(4, 6);
  const fullYear = yy >= 70 ? 1900 + yy : 2000 + yy;

  return `${fullYear}-${mm}-${dd}`;
}

function extractHealthCanadaId(ai91Value) {
  if (!ai91Value) {
    return null;
  }

  const match = String(ai91Value).match(/HC(\d+)/i);
  return match ? match[1] : String(ai91Value).replace(/\D/g, '') || null;
}

export function parseGs1Text(rawText) {
  const normalized = normalizeGs1Text(rawText);
  const aiValues = normalized.includes('(')
    ? extractParenthesizedAIs(normalized)
    : extractSequentialAIs(normalized);

  const gtin = aiValues['01'] || null;
  const lotNumber = aiValues['10'] || null;
  const expiryDate = parseExpiryDateYYMMDD(aiValues['17']);
  const quantity = aiValues['30'] ? Number(aiValues['30']) : null;
  const internalProductId = aiValues['240'] || null;
  const healthCanadaDrugProductId = extractHealthCanadaId(aiValues['91']);

  return {
    scanType: 'GS1',
    rawText,
    gtin,
    barcodeData: gtin,
    lotNumber,
    expiryDate,
    quantity: Number.isFinite(quantity) ? quantity : null,
    internalProductId,
    healthCanadaDrugProductId,
    aiValues
  };
}

export function looksLikeGs1Payload(rawText) {
  const normalized = normalizeGs1Text(rawText);
  return normalized.includes('(01)') || normalized.startsWith('01');
}
