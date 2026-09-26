import { CipherStep, CipherResult } from '../types/crypto';
import { CipherError } from '@/lib/cipherError';

export function processCaesar(text: string, shift: number, mode: 'encrypt' | 'decrypt'): CipherResult {
  const steps: CipherStep[] = [];
  let resultText = '';

  if (!Number.isInteger(shift)) {
    throw new CipherError('SHIFT_NOT_INTEGER', `The value ${JSON.stringify(shift)} is not an integer.`);
  }

  // Ensure shift is within 0-25 and positive
  const effectiveShift = ((mode === 'encrypt' ? shift : -shift) % 26 + 26) % 26;
  const isDecrypt = mode === 'decrypt';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const isUpper = char >= 'A' && char <= 'Z';
    const isLower = char >= 'a' && char <= 'z';
    
    if (isUpper || isLower) {
      // Base ASCII code: 'A' = 65, 'a' = 97
      const base = isUpper ? 65 : 97;
      const originalCode = char.charCodeAt(0) - base; // 0-25
      const shiftedCode = (originalCode + effectiveShift) % 26;
      const newChar = String.fromCharCode(shiftedCode + base);
      
      const sign = isDecrypt ? '-' : '+';
      const actualShift = shift % 26;
      const formula = `${char} (${originalCode}) ${sign} ${actualShift} ≡ ${shiftedCode} mod 26 -> ${newChar}`;
      
      resultText += newChar;
      steps.push({
        originalChar: char,
        originalCode,
        shiftedCode,
        newChar,
        formula,
        isAlphabetic: true
      });
    } else {
      // Non-alphabetic characters remain unchanged
      resultText += char;
      steps.push({
        originalChar: char,
        newChar: char,
        formula: 'N/A (Non-alphabetic)',
        isAlphabetic: false
      });
    }
  }

  return { resultText, steps };
}
