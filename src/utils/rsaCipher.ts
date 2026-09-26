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

// Check if prime
function isPrime(num: number): boolean {
  for (let i = 2, s = Math.sqrt(num); i <= s; i++)
    if (num % i === 0) return false;
  return num > 1;
}

export function processRSA(text: string, pStr: string, qStr: string, eStr: string, mode: 'encrypt' | 'decrypt', customD?: number): RsaResult {
  const steps: RsaStep[] = [];
  let resultText = '';
  
  // Default fallback primes and public exponent for visualization
  const p = isPrime(parseInt(pStr)) ? parseInt(pStr) : 11;
  const q = isPrime(parseInt(qStr)) ? parseInt(qStr) : 13;
  const n = p * q;
  const phi = (p - 1) * (q - 1);
  let e = parseInt(eStr) || 7;
  
  // Find d
  let d = 1;
  while ((d * e) % phi !== 1) {
    d++;
    // Failsafe
    if (d > 10000) { d = 103; break; } 
  }
  
  // Override d if decrypting and provided (for realism)
  if (mode === 'decrypt' && customD) {
    d = customD;
  }

  // Encryption/Decryption
  // Real RSA outputs numbers. To make copy-pasting work and avoid unprintable character bugs,
  // we will output Encrypted data as space-separated numbers, and expect space-separated numbers for Decryption.
  
  const inputArray = mode === 'encrypt' 
    ? text.split('') 
    : text.trim().split(/\s+/); // split by spaces

  for (let i = 0; i < inputArray.length; i++) {
    const item = inputArray[i];
    if (!item) continue;

    let charCode = 0;
    let char = '';
    
    if (mode === 'encrypt') {
      char = item;
      charCode = char.charCodeAt(0);
    } else {
      charCode = parseInt(item);
      if (isNaN(charCode)) continue;
      char = `[${charCode}]`; // Represent the raw number block
    }
    
    let resultCode = 0;
    let formula = '';
    
    if (mode === 'encrypt') {
      // C = M^e mod n
      resultCode = modExp(charCode, e, n);
      formula = `${charCode}^${e} mod ${n} = ${resultCode}`;
      resultText += (resultText ? ' ' : '') + resultCode.toString();
    } else {
      // M = C^d mod n
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
      resultChar
    });
  }

  return {
    resultText,
    publicKey: { e, n },
    privateKey: { d, n },
    steps,
    mathDetails: { p, q, n, phi, e, d }
  };
}
