'use client';

import { useState } from 'react';
import { processLFSR, LfsrResult } from '@/utils/lfsrCipher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight, Lock, Unlock, TriangleAlert } from 'lucide-react';
import { ValidationNotice } from '@/components/ValidationNotice';
import { ResultStatus } from '@/components/ResultStatus';
import { CopyButton } from '@/components/CopyButton';
import { useCipherRun } from '@/hooks/useCipherRun';
import { CipherError } from '@/lib/cipherError';
import { checkInputLength } from '@/lib/cipherLimits';

export default function LfsrCipherPage() {
  const [inputText, setInputText] = useState('');
  const [seed, setSeed] = useState('1001');
  const { result, error, run, mode, setMode } = useCipherRun<LfsrResult>();

  const handleProcess = (selectedMode: 'encrypt' | 'decrypt') => {
    setMode(selectedMode);
    run(() => {
      if (!inputText) {
        throw new CipherError('EMPTY_INPUT');
      }
      checkInputLength(inputText.length, 'lfsr');
      return processLFSR(inputText, seed);
    });
  };

  return (
    <div className="container mx-auto py-10 space-y-8 max-w-5xl">
      <div className="flex flex-col space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">LFSR & Vernam Cipher</h1>
        <p className="text-muted-foreground">
          A Stream Cipher visualization. A Linear Feedback Shift Register (LFSR) generates a random keystream bit-by-bit, which is XOR-ed with the Plaintext bits (Vernam Cipher).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Enter your text and an initial binary seed (e.g. 10110).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="input-text">Text</Label>
              <Textarea
                id="input-text"
                placeholder="Enter text..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="min-h-[120px] resize-none"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="seed">Binary Seed (Initial State)</Label>
              <Input
                id="seed"
                type="text"
                placeholder="1001"
                value={seed}
                onChange={(e) => setSeed(e.target.value.replace(/[^01]/g, ''))}
                className="max-w-xs font-mono tracking-widest"
              />
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

            <ValidationNotice info={error} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Final Result</CardTitle>
            <CardDescription>
              {mode === 'encrypt' ? 'Encrypted Result' : 'Decrypted Result'} (Note: Ciphertext may contain unprintable characters)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-6 min-h-[220px] flex flex-col items-center justify-center gap-4 border">
              {result ? (
                <>
                  <p className="text-lg font-mono text-center break-all text-foreground">
                    {result.resultText}
                  </p>
                  <CopyButton value={result.resultText} />
                </>
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
            <ResultStatus hasResult={Boolean(result)} error={error} mode={mode} />
          </CardContent>
        </Card>
      </div>

      {result && result.steps.length > 0 && (
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader>
            <CardTitle>Bit-by-Bit Keystream Generation (LFSR)</CardTitle>
            <CardDescription>
              How the initial seed shifts left-to-right to produce a seemingly random keystream. (Tap uses the 2 rightmost bits).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border p-4 max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Target Char</TableHead>
                    <TableHead>Bit Index</TableHead>
                    <TableHead className="font-mono">State Before</TableHead>
                    <TableHead>Tap (XOR) Math</TableHead>
                    <TableHead>Generated Bit</TableHead>
                    <TableHead className="font-mono">State After</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.steps.map((step, sIdx) => 
                    step.shiftDetails.map((shift, bIdx) => (
                      <TableRow key={`${sIdx}-${bIdx}`} className={bIdx === 7 ? 'border-b-4' : ''}>
                        <TableCell className="font-bold">{bIdx === 0 ? `'${step.char}'` : ''}</TableCell>
                        <TableCell>Bit {bIdx + 1}</TableCell>
                        <TableCell className="font-mono tracking-widest bg-muted/30">{shift.stateBefore}</TableCell>
                        <TableCell className="font-mono text-xs">{shift.tapMath}</TableCell>
                        <TableCell className="font-mono font-bold text-primary">{shift.stateBefore[shift.stateBefore.length-1]}</TableCell>
                        <TableCell className="font-mono tracking-widest">{shift.stateAfter}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {result && result.steps.length > 0 && (
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          <CardHeader>
            <CardTitle>Vernam Cipher (XOR Application)</CardTitle>
            <CardDescription>
              Stream ciphers encrypt by XOR-ing the generated Keystream directly with the Plaintext bits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-center w-[120px]">Character</TableHead>
                    <TableHead className="text-center">Binary (Text)</TableHead>
                    <TableHead className="text-center text-primary">Binary (Keystream)</TableHead>
                    <TableHead className="text-center">XOR Result</TableHead>
                    <TableHead className="text-center w-[120px]">Final Char</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.steps.map((step, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-center font-bold text-lg">
                        {step.char}
                      </TableCell>
                      <TableCell className="text-center font-mono tracking-widest text-muted-foreground">
                        {step.charBinary}
                      </TableCell>
                      <TableCell className="text-center font-mono tracking-widest font-bold text-primary">
                        {step.keystreamBinary}
                      </TableCell>
                      <TableCell className="text-center font-mono tracking-widest text-foreground font-bold border-l-2 border-r-2 bg-muted/20">
                        {step.xorResultBinary}
                      </TableCell>
                      <TableCell className="text-center font-bold text-lg">
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
