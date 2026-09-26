'use client';

import { useState } from 'react';
import { processCaesar } from '@/utils/caesarCipher';
import { processVigenere } from '@/utils/vigenereCipher';
import { processLFSR } from '@/utils/lfsrCipher';
import { processRSA } from '@/utils/rsaCipher';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Lock, Unlock, ShieldCheck, ChevronDown, TriangleAlert } from 'lucide-react';
import { ValidationNotice } from '@/components/ValidationNotice';
import { ResultStatus } from '@/components/ResultStatus';
import { CopyButton } from '@/components/CopyButton';
import { useCipherRun } from '@/hooks/useCipherRun';
import { CipherError, isCipherError } from '@/lib/cipherError';
import { checkInputLength } from '@/lib/cipherLimits';

import { CipherResult } from '@/types/crypto';
import { LfsrResult } from '@/utils/lfsrCipher';
import { RsaResult } from '@/utils/rsaCipher';

type ProcessStep =
  | { title: string; algorithm: 'caesar'; output: string; data: CipherResult }
  | { title: string; algorithm: 'vigenere'; output: string; data: CipherResult }
  | { title: string; algorithm: 'lfsr'; output: string; data: LfsrResult }
  | { title: string; algorithm: 'rsa'; output: string; data: RsaResult };

interface PipelineResult {
  finalOut: string;
  steps: ProcessStep[];
}

const STAGE_LABELS = {
  caesar: 'Caesar Cipher',
  vigenere: 'Vigenère Cipher',
  lfsr: 'LFSR & Vernam',
  rsa: 'RSA',
} as const;

/**
 * Runs one pipeline stage and, if it fails, re-raises the same CipherError with
 * the stage name attached. Without this the user sees a message about, say, a
 * non-prime p but has no way to know it came from the RSA stage.
 */
function runStage<T>(stage: keyof typeof STAGE_LABELS, action: () => T): T {
  try {
    return action();
  } catch (caught) {
    if (isCipherError(caught)) {
      throw new CipherError(
        caught.code,
        `This happened in the ${STAGE_LABELS[stage]} stage. ${caught.detail ?? ''}`.trim()
      );
    }
    throw caught;
  }
}

export default function SuperEncryptionPage() {
  const [inputText, setInputText] = useState('');

  // Keys State
  const [caesarShift, setCaesarShift] = useState('3');
  const [vigenereKey, setVigenereKey] = useState('KEY');
  const [lfsrSeed, setLfsrSeed] = useState('1001');
  // p=17, q=19 -> n=323, which is above the 0-255 byte range so the LFSR output
  // always satisfies the RSA requirement that every block m stays below n.
  const [rsaP, setRsaP] = useState('17');
  const [rsaQ, setRsaQ] = useState('19');
  const [rsaE, setRsaE] = useState('11');

  const { result, error, run, mode, setMode } = useCipherRun<PipelineResult>();

  const handleProcess = (selectedMode: 'encrypt' | 'decrypt') => {
    setMode(selectedMode);
    run(() => {
      if (!inputText) {
        throw new CipherError('EMPTY_INPUT');
      }
      checkInputLength(inputText.length, 'superEncryption');

      const shift = /^-?\d+$/.test(caesarShift.trim()) ? parseInt(caesarShift, 10) : Number.NaN;

      if (selectedMode === 'encrypt') {
        const cRes = runStage('caesar', () =>
          processCaesar(inputText, shift, 'encrypt')
        );
        const vRes = runStage('vigenere', () =>
          processVigenere(cRes.resultText, vigenereKey, 'encrypt')
        );
        const lRes = runStage('lfsr', () => processLFSR(vRes.resultText, lfsrSeed));
        const rRes = runStage('rsa', () =>
          processRSA(lRes.resultText, rsaP, rsaQ, rsaE, 'encrypt')
        );

        return {
          finalOut: rRes.resultText,
          steps: [
            { title: '1. Caesar Cipher', algorithm: 'caesar', output: cRes.resultText, data: cRes },
            { title: '2. Vigenère Cipher', algorithm: 'vigenere', output: vRes.resultText, data: vRes },
            { title: '3. LFSR & Vernam', algorithm: 'lfsr', output: lRes.resultText, data: lRes },
            { title: '4. RSA (Public Key)', algorithm: 'rsa', output: rRes.resultText, data: rRes },
          ],
        };
      }

      const rRes = runStage('rsa', () =>
        processRSA(inputText, rsaP, rsaQ, rsaE, 'decrypt')
      );
      const lRes = runStage('lfsr', () => processLFSR(rRes.resultText, lfsrSeed));
      const vRes = runStage('vigenere', () =>
        processVigenere(lRes.resultText, vigenereKey, 'decrypt')
      );
      const cRes = runStage('caesar', () =>
        processCaesar(vRes.resultText, shift, 'decrypt')
      );

      return {
        finalOut: cRes.resultText,
        steps: [
          { title: '1. Dekripsi RSA', algorithm: 'rsa', output: rRes.resultText, data: rRes },
          { title: '2. Dekripsi LFSR (Vernam)', algorithm: 'lfsr', output: lRes.resultText, data: lRes },
          { title: '3. Dekripsi Vigenère', algorithm: 'vigenere', output: vRes.resultText, data: vRes },
          { title: '4. Dekripsi Caesar', algorithm: 'caesar', output: cRes.resultText, data: cRes },
        ],
      };
    });
  };

  // Helper renderers for dropdown tables
  const renderCaesarVigenereTable = (data: CipherResult) => (
    <Table className="text-sm">
      <TableHeader>
        <TableRow><TableHead>Ori</TableHead><TableHead>Math</TableHead><TableHead>Result</TableHead></TableRow>
      </TableHeader>
      <TableBody>
        {data.steps.map((s, i) => (
          <TableRow key={i} className={!s.isAlphabetic ? 'opacity-50' : ''}>
            <TableCell className="font-bold">{s.originalChar}</TableCell>
            <TableCell className="font-mono text-xs">{s.formula}</TableCell>
            <TableCell className="font-bold text-primary">{s.newChar}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderLfsrTable = (data: LfsrResult) => (
    <Table className="text-sm">
      <TableHeader>
        <TableRow><TableHead>Char</TableHead><TableHead>Txt Bin</TableHead><TableHead>Key Bin</TableHead><TableHead>XOR (Out)</TableHead></TableRow>
      </TableHeader>
      <TableBody>
        {data.steps.map((s, i) => (
          <TableRow key={i}>
            <TableCell className="font-bold">{s.char}</TableCell>
            <TableCell className="font-mono">{s.charBinary}</TableCell>
            <TableCell className="font-mono text-primary">{s.keystreamBinary}</TableCell>
            <TableCell className="font-mono font-bold">{s.xorResultBinary}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderRsaTable = (data: RsaResult) => (
    <Table className="text-sm">
      <TableHeader>
        <TableRow><TableHead>Char/Block</TableHead><TableHead>Code</TableHead><TableHead>Mod Exp</TableHead><TableHead>Out Code</TableHead></TableRow>
      </TableHeader>
      <TableBody>
        {data.steps.map((s, i) => (
          <TableRow key={i}>
            <TableCell className="font-bold">{s.char}</TableCell>
            <TableCell className="font-mono">{s.charCode}</TableCell>
            <TableCell className="font-mono text-xs">{s.formula}</TableCell>
            <TableCell className="font-bold text-primary">{s.resultCode}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="container mx-auto py-10 space-y-8 max-w-5xl">
      <div className="flex flex-col space-y-2">
        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
          <ShieldCheck className="w-10 h-10 text-primary" />
          Super Encryption
        </h1>
        <p className="text-muted-foreground">
          Kombinasi berantai (Pipeline) dari 4 algoritma sekaligus untuk keamanan maksimal.
          Klik setiap tahapan di bawah untuk melihat detail kalkulasi matematis per bloknya!
        </p>
      </div>

      <div className="flex flex-col gap-8">
        <Card className="border-primary/50 shadow-md">
          <CardHeader>
            <CardTitle>Master Control Panel</CardTitle>
            <CardDescription>Masukkan teks dan semua kunci dari keempat algoritma.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="input-text" className="font-bold">Text Input</Label>
              <Textarea
                id="input-text"
                placeholder={mode === 'encrypt' ? 'Masukkan Plaintext...' : 'Masukkan Ciphertext (angka terpisah spasi)...'}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="min-h-[100px] resize-none border-primary/30 focus-visible:ring-primary"
              />
            </div>
            
            <div className="space-y-4 bg-muted/30 p-4 rounded-lg border">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Kunci Klasik</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="caesar-shift">Caesar Shift</Label>
                  <Input id="caesar-shift" type="number" value={caesarShift} onChange={(e) => setCaesarShift(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vigenere-key">Vigenère Key</Label>
                  <Input id="vigenere-key" type="text" value={vigenereKey} onChange={(e) => setVigenereKey(e.target.value.toUpperCase())} className="uppercase" />
                </div>
              </div>

              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mt-4 border-t pt-4">Kunci Modern</h3>
              <div className="space-y-2">
                <Label htmlFor="lfsr-seed">LFSR Binary Seed</Label>
                <Input id="lfsr-seed" type="text" value={lfsrSeed} onChange={(e) => setLfsrSeed(e.target.value.replace(/[^01]/g, ''))} className="font-mono tracking-widest" />
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="rsa-p">RSA p</Label>
                  <Input id="rsa-p" type="number" value={rsaP} onChange={(e) => setRsaP(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rsa-q">RSA q</Label>
                  <Input id="rsa-q" type="number" value={rsaQ} onChange={(e) => setRsaQ(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rsa-e">RSA e</Label>
                  <Input id="rsa-e" type="number" value={rsaE} onChange={(e) => setRsaE(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex space-x-4 pt-2">
              <Button onClick={() => handleProcess('encrypt')} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-lg">
                <Lock className="w-5 h-5 mr-2" /> Encrypt Pipeline
              </Button>
              <Button onClick={() => handleProcess('decrypt')} variant="secondary" className="flex-1 h-12 text-lg border shadow-sm">
                <Unlock className="w-5 h-5 mr-2" /> Decrypt Pipeline
              </Button>
            </div>

            <ValidationNotice info={error} />
          </CardContent>
        </Card>

        <div className="flex flex-col space-y-6">
          <Card className="flex-1 bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle>Final Result</CardTitle>
              <CardDescription>
                Hasil mutlak dari keempat lapisan algoritma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-background rounded-lg p-6 min-h-[150px] flex flex-col items-center justify-center gap-4 border">
                {result ? (
                  <>
                    <p className="text-2xl font-mono text-center break-all text-primary font-bold">
                      {result.finalOut}
                    </p>
                    <CopyButton value={result.finalOut} />
                  </>
                ) : error ? (
                  <p className="text-muted-foreground flex items-center">
                    <TriangleAlert aria-hidden="true" className="w-5 h-5 mr-2" />
                    No result. See the message above.
                  </p>
                ) : (
                  <p className="text-muted-foreground flex items-center">
                    Awaiting configuration...
                  </p>
                )}
              </div>
              <ResultStatus hasResult={Boolean(result)} error={error} mode="encrypt" noun="super-encrypted text" />
            </CardContent>
          </Card>

          {/* Visualisasi Pipeline Berantai Dropdown */}
          {result && (
            <Card className="animate-in fade-in slide-in-from-right-8 duration-700 flex-1">
              <CardHeader>
                <CardTitle>Pipeline Transformasi Dropdown</CardTitle>
                <CardDescription>Klik setiap tahapan untuk melihat tabel detail kalkulasi matematis (per karakter/blok).</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col">
                  
                  {/* Step 0: Input */}
                  <div className="p-3 bg-muted/50 border rounded text-center mb-2">
                    <span className="text-xs uppercase font-bold text-muted-foreground block mb-1">Original Input</span>
                    <span className="font-mono break-all">{inputText}</span>
                  </div>

                  {result.steps.map((step, idx) => (
                    <div key={idx} className="flex flex-col items-center w-full">
                      <ChevronDown className="w-5 h-5 text-primary/50 my-1" />
                      
                      <details className="group w-full border rounded-lg bg-card shadow-sm cursor-pointer [&_summary::-webkit-details-marker]:hidden">
                        <summary className="p-4 font-bold flex flex-col md:flex-row md:items-center justify-between hover:bg-muted/50 list-none gap-2">
                          <span className="text-primary group-open:text-foreground transition-colors">{step.title}</span>
                          <span className="text-xs font-mono opacity-80 break-all text-left md:text-right text-muted-foreground">
                            {step.output.length > 50 ? step.output.substring(0, 50) + '...' : step.output}
                          </span>
                        </summary>
                        <div className="p-4 border-t bg-background/50 overflow-x-auto">
                          {(step.algorithm === 'caesar' || step.algorithm === 'vigenere') && renderCaesarVigenereTable(step.data)}
                          {step.algorithm === 'lfsr' && renderLfsrTable(step.data)}
                          {step.algorithm === 'rsa' && renderRsaTable(step.data)}
                        </div>
                      </details>
                    </div>
                  ))}

                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
