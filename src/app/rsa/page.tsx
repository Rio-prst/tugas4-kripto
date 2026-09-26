'use client';

import { useState } from 'react';
import { processRSA, RsaResult } from '@/utils/rsaCipher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight, Lock, Unlock, KeyRound, TriangleAlert } from 'lucide-react';
import { ValidationNotice } from '@/components/ValidationNotice';
import { useCipherRun } from '@/hooks/useCipherRun';
import { CipherError } from '@/lib/cipherError';
import { checkInputLength } from '@/lib/cipherLimits';

export default function RsaCipherPage() {
  const [inputText, setInputText] = useState('');
  const [pVal, setPVal] = useState('11');
  const [qVal, setQVal] = useState('13');
  const [eVal, setEVal] = useState('7');
  const { result, error, run, mode, setMode } = useCipherRun<RsaResult>();

  const handleProcess = (selectedMode: 'encrypt' | 'decrypt') => {
    setMode(selectedMode);
    run(() => {
      if (!inputText.trim()) {
        throw new CipherError('EMPTY_INPUT');
      }
      checkInputLength(inputText.length, 'rsa');
      return processRSA(inputText, pVal, qVal, eVal, selectedMode);
    });
  };

  return (
    <div className="container mx-auto py-10 space-y-8 max-w-5xl">
      <div className="flex flex-col space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">RSA (Public Key Cryptography)</h1>
        <p className="text-muted-foreground">
          An asymmetric cipher where you encrypt with a Public Key and decrypt with a Private Key. This visualizer uses small prime numbers to make the math readable.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Key Generation & Input</CardTitle>
            <CardDescription>Provide two small prime numbers (p, q) and a public exponent (e).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="input-text">Text (Use space-separated numbers if decrypting)</Label>
              <Textarea
                id="input-text"
                placeholder={mode === 'encrypt' ? 'Enter text...' : 'e.g. 104 22 89'}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="min-h-[120px] resize-none"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="p-val">Prime p</Label>
                <Input
                  id="p-val"
                  type="number"
                  value={pVal}
                  onChange={(e) => setPVal(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="q-val">Prime q</Label>
                <Input
                  id="q-val"
                  type="number"
                  value={qVal}
                  onChange={(e) => setQVal(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-val">Exp e</Label>
                <Input
                  id="e-val"
                  type="number"
                  value={eVal}
                  onChange={(e) => setEVal(e.target.value)}
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <Button
                onClick={() => handleProcess('encrypt')}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Lock className="w-4 h-4 mr-2" />
                Encrypt
              </Button>
              <Button
                onClick={() => handleProcess('decrypt')}
                variant="secondary"
                className="flex-1"
              >
                <Unlock className="w-4 h-4 mr-2" />
                Decrypt
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Message space: a single character is encrypted as one block, so RSA
              requires <code className="font-mono">0 &lt;= m &lt; n</code>. With the
              default primes n = 143, which covers every ASCII character (code 0-127).
            </p>

            <ValidationNotice info={error} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Final Result</CardTitle>
            <CardDescription>
              {mode === 'encrypt' ? 'Ciphertext (Space-separated number blocks)' : 'Plaintext (Rendered as ASCII characters)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-6 min-h-[220px] flex items-center justify-center border">
              {result ? (
                <p className="text-2xl font-mono text-center break-all text-foreground">
                  {result.resultText}
                </p>
              ) : error ? (
                <p className="text-muted-foreground flex items-center">
                  <TriangleAlert className="w-5 h-5 mr-2" />
                  No result. See the message on the left.
                </p>
              ) : (
                <p className="text-muted-foreground flex items-center">
                  <ArrowRight className="w-5 h-5 mr-2 animate-pulse" />
                  Awaiting input
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {result && (
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              RSA Key Generation Math
            </CardTitle>
            <CardDescription>
              How the asymmetric keys are mathematically calculated from your prime numbers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                <h3 className="font-semibold border-b pb-2">1. Find n and φ(n)</h3>
                <p className="font-mono text-sm">
                  <span className="text-muted-foreground">p =</span> {result.mathDetails.p}<br/>
                  <span className="text-muted-foreground">q =</span> {result.mathDetails.q}
                </p>
                <div className="bg-background border p-2 rounded text-sm font-mono">
                  n = p × q = <strong>{result.mathDetails.n}</strong>
                </div>
                <div className="bg-background border p-2 rounded text-sm font-mono">
                  φ(n) = (p-1) × (q-1) = <strong>{result.mathDetails.phi}</strong>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                <h3 className="font-semibold border-b pb-2">2. Find Public & Private Keys</h3>
                <p className="font-mono text-sm">
                  <span className="text-muted-foreground">Public Exp (e) =</span> {result.mathDetails.e}
                </p>
                <div className="bg-primary/10 text-primary border-primary/20 border p-2 rounded text-sm font-mono">
                  Public Key (e, n): <strong>({result.publicKey.e}, {result.publicKey.n})</strong>
                </div>
                <div className="bg-destructive/10 text-destructive border-destructive/20 border p-2 rounded text-sm font-mono mt-2">
                  <span className="block mb-1 text-xs text-muted-foreground">d = modular inverse of e (d × e = 1 mod φ(n))</span>
                  Private Key (d, n): <strong>({result.privateKey.d}, {result.privateKey.n})</strong>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result && result.steps.length > 0 && (
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          <CardHeader>
            <CardTitle>Mathematical Encryption/Decryption</CardTitle>
            <CardDescription>
              {mode === 'encrypt' ? 'C = M^e mod n' : 'M = C^d mod n'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[100px] text-center">{mode === 'encrypt' ? 'Char' : 'Block (Num)'}</TableHead>
                    <TableHead className="text-center">{mode === 'encrypt' ? 'ASCII (Base)' : 'Cipher (Base)'}</TableHead>
                    <TableHead>Modular Exponentiation Formula</TableHead>
                    <TableHead className="text-center">Result Code</TableHead>
                    <TableHead className="text-center w-[100px]">{mode === 'encrypt' ? 'Cipher Block' : 'Result Char'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.steps.map((step, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-center font-mono font-bold text-lg">
                        {step.char}
                      </TableCell>
                      <TableCell className="text-center font-mono text-muted-foreground">
                        {step.charCode}
                      </TableCell>
                      <TableCell className="font-mono text-sm bg-muted/10">
                        {step.formula}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-primary">
                        {step.resultCode}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-lg">
                        {step.resultChar}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
