export interface CipherStep {
  originalChar: string;
  originalCode?: number;
  shiftedCode?: number;
  newChar: string;
  formula: string; // E.g., "7 + 3 = 10" or "P = (C - K) mod 26"
  isAlphabetic: boolean;
}

export interface CipherResult {
  resultText: string;
  steps: CipherStep[];
}
