import { CipherError } from '@/lib/cipherError';

export interface RsaStep {
  char: string;
  charCode: number;
  formula: string;
  resultCode: number;
  resultChar: string;
}

export interface RsaResult {
  resultText: string;
  publicKey: { e: number; n: number };
  privateKey: { d: number; n: number };
  steps: RsaStep[];
  mathDetails: {
    p: number;
    q: number;
    n: number;
    phi: number;
    e: number;
    d: number;
  };
}

// Modulo exponentiation (base^exp % mod) avoiding overflow
function modExp(base: number, exp: number, mod: number): number {
  let res = 1;
  base = base % mod;
  while (exp > 0) {
    if (exp % 2 === 1) res = (res * base) % mod;
    exp = Math.floor(exp / 2);
    base = (base * base) % mod;
  }
  return res;
}

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

// Extended Euclidean algorithm. Returns [g, x, y] where a*x + b*y = g.
function extendedGcd(a: number, b: number): [number, number, number] {
  if (b === 0) return [a, 1, 0];
  const [g, x1, y1] = extendedGcd(b, a % b);
  return [g, y1, x1 - Math.floor(a / b) * y1];
}

// Modular inverse of a mod m, or null when the inverse does not exist.
export function modInverse(a: number, m: number): number | null {
  const [g, x] = extendedGcd(((a % m) + m) % m, m);
  if (g !== 1) return null;
  return ((x % m) + m) % m;
}

export function isPrime(num: number): boolean {
  if (!Number.isInteger(num) || num < 2) return false;
  if (num % 2 === 0) return num === 2;
  for (let i = 3; i * i <= num; i += 2) {
    if (num % i === 0) return false;
  }
  return true;
}

function parseRequiredInt(raw: string, label: string): number {
  const trimmed = raw.trim();
  if (!/^-?\d+$/.test(trimmed)) {
    throw new CipherError('E_INVALID', `${label} must be a whole number, but "${raw}" is not.`);
  }
  return parseInt(trimmed, 10);
}

export function processRSA(
  text: string,
  pStr: string,
  qStr: string,
  eStr: string,
  mode: 'encrypt' | 'decrypt'
): RsaResult {
  const steps: RsaStep[] = [];
  let resultText = '';

  const p = parseRequiredInt(pStr, 'p');
  const q = parseRequiredInt(qStr, 'q');
  const e = parseRequiredInt(eStr, 'e');

  if (!isPrime(p)) {
    throw new CipherError('P_NOT_PRIME', `p = ${p} is not prime.`);
  }
  if (!isPrime(q)) {
    throw new CipherError('Q_NOT_PRIME', `q = ${q} is not prime.`);
  }
  if (p === q) {
    throw new CipherError('P_EQUALS_Q');
  }

  const n = p * q;
  const phi = (p - 1) * (q - 1);

  if (e <= 1 || e >= phi) {
    throw new CipherError('E_INVALID', `With p = ${p} and q = ${q} you have phi(n) = ${phi}, so e must satisfy 1 < e < ${phi}, but e = ${e}.`);
  }
  if (gcd(e, phi) !== 1) {
    throw new CipherError(
      'E_NOT_COPRIME',
      `Here phi(n) = ${phi} and e = ${e}, and gcd(${e}, ${phi}) = ${gcd(e, phi)} > 1, so e·d ≡ 1 (mod ${phi}) has no solution.`
    );
  }

  const d = modInverse(e, phi);
  if (d === null) {
    // Unreachable when gcd(e, phi) === 1, but the inverse is genuinely
    // optional so TypeScript needs the guard.
    throw new CipherError('E_NOT_COPRIME', `No modular inverse of ${e} modulo ${phi} exists.`);
  }

  // Real RSA produces numbers. To make copy-pasting work and avoid unprintable
  // character bugs, encrypted data is emitted as space-separated numbers, and
  // decryption expects space-separated numbers.
  const inputArray =
    mode === 'encrypt' ? text.split('') : text.trim().split(/\s+/).filter(Boolean);

  for (let i = 0; i < inputArray.length; i++) {
    const item = inputArray[i];
    if (!item) continue;

    let charCode = 0;
    let char = '';

    if (mode === 'encrypt') {
      char = item;
      charCode = char.charCodeAt(0);
      if (charCode >= n) {
        throw new CipherError(
          'MESSAGE_OUT_OF_RANGE',
          `The character "${char}" has code ${charCode}, which is not below n = ${n}.`
        );
      }
    } else {
      if (!/^\d+$/.test(item)) {
        throw new CipherError('CIPHERTEXT_NOT_NUMERIC', `"${item}" is not a number.`);
      }
      charCode = parseInt(item, 10);
      if (charCode >= n) {
        throw new CipherError(
          'CIPHERTEXT_OUT_OF_RANGE',
          `The block ${charCode} is not below n = ${n}.`
        );
      }
      char = `[${charCode}]`;
    }

    let resultCode = 0;
    let formula = '';

    if (mode === 'encrypt') {
      resultCode = modExp(charCode, e, n);
      formula = `${charCode}^${e} mod ${n} = ${resultCode}`;
      resultText += (resultText ? ' ' : '') + resultCode.toString();
    } else {
      resultCode = modExp(charCode, d, n);
      formula = `${charCode}^${d} mod ${n} = ${resultCode}`;
      resultText += String.fromCharCode(resultCode);
    }

    const resultChar = mode === 'encrypt' ? resultCode.toString() : String.fromCharCode(resultCode);

    steps.push({
      char,
      charCode,
      formula,
      resultCode,
      resultChar,
    });
  }

  return {
    resultText,
    publicKey: { e, n },
    privateKey: { d, n },
    steps,
    mathDetails: { p, q, n, phi, e, d },
  };
}
