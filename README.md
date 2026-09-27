# KryptoLearn

A Next.js app that shows how ciphers actually work, by running them in the
browser and displaying the state at every step instead of just the final
answer.

**This project exists for education.** It was built for a cryptography course
as a way to watch each algorithm's internal state move, not to protect
anything. The primes are small, the register is short, and every algorithm here
is breakable by hand or by well-known published attacks. See
[Known limitations](#known-limitations) before drawing any conclusion from it.

The algorithm guides in [`docs/`](docs/) are the reference this implementation
was written against, and the worked examples in those documents are used as
test oracles.

| Page | Category | What it shows |
| --- | --- | --- |
| `/caesar` | Classical substitution | Per-character alphabet index, shift, and wraparound |
| `/vigenere` | Classical substitution | Key alignment, repeated key, and per-character addition mod 26 |
| `/lfsr` | Stream cipher | Register state at every shift, the tap XOR, and the generated keystream |
| `/rsa` | Asymmetric | Per-character modular exponentiation and the key derivation |
| `/super-encryption` | Layered | All four chained, with each intermediate layer |

There is no server and no persistence. Every cipher is implemented in
`src/utils/`, is pure, and is covered by unit tests.

## Running it

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000). The root redirects to
the Caesar page.

```bash
npm test         # vitest
npm run lint     # eslint
npm run typecheck
npm run build
```

## Output encoding

Two ciphers produce raw bytes, and a browser can only be handed text. Hex is the
representation layer that bridges the two. **It is not part of either
algorithm** — nothing about the XOR or the modular exponentiation changes. It
is only the form the bytes travel in, so that a result can be displayed and
copied without loss.

**LFSR** emits one byte per plaintext character as two hex digits, `00` to
`ff`, concatenated with no separator and no `0x` prefix. Decryption reads that
hex back, ignoring whitespace and accepting either case. An odd number of hex
digits is rejected rather than rounded away, because a half byte means the
paste was truncated.

This matters because the XOR routinely lands outside the printable range. The
guide's own worked example produces `0x90`, which is `é` in Latin-1 but an
unassigned control character in Windows-1252 — the same byte, rendered
differently depending on the browser. Hex removes the ambiguity.

**RSA** has the same problem for a different reason: a ciphertext block is an
integer, not a character. It emits space-separated numbers instead of hex, and
decryption expects them back in that form.

## Known limitations

These are deliberate, and worth knowing before drawing conclusions from the app.

### None of this is secure encryption

The algorithms here are the standard textbook ones, and each has a well-known
attack:

- **Caesar** is a monoalphabetic substitution. Frequency analysis breaks it.
- **Vigenère** is polyalphabetic, but the Kasiski examination and the Friedman
  test both recover the key length, after which frequency analysis on each
  column finishes the job.
- **LFSR as a keystream generator** is linear, so Berlekamp–Massey recovers the
  feedback polynomial and the register state from a keystream of length `2L`.
  The 4-bit default seed is therefore recoverable from 8 bits of keystream,
  which the LFSR page prints in full.
- **RSA** uses primes chosen for legibility, not size.

None of this is a criticism of the project, which is a teaching aid, but it
does mean the app must not be used with data that matters.

### The LFSR only handles byte-sized characters

Each character is converted to 8 bits, and only 8 bits of keystream are
generated per character. That is fine for every code point from 0 to 255.

Above that, the conversion pads the binary form to 8 characters and then reads
only those 8, so **the leading bits are kept and the trailing bits are silently
discarded**. `U+0100` (256) becomes `0b10000000`, that is 128, not 0. The page
does not warn about this, because the input is usually plain text; it only
surfaces if you paste an unusual character into it.

The truncation is one-way, so the hex output of the LFSR stage always decodes
back to bytes that are in range.

## Input validation rules

The cipher utilities reject invalid input instead of substituting a fallback.
This document explains *why* each rule exists, because in every case the
alternative was a silent failure that looked like a successful run.

### RSA

RSA is implemented per its mathematical requirements:

| Requirement | Consequence when violated |
| --- | --- |
| `p` and `q` are distinct primes | A composite factor makes `n` trivially factorable |
| `n = p·q`, `φ = (p−1)(q−1)` | — |
| `1 < e < φ` | `e` outside this range has no inverse |
| `gcd(e, φ) = 1` | **No private key exists at all** |
| `d = e⁻¹ mod φ` | Computed with the extended Euclidean algorithm |
| `0 ≤ m < n` | Required, because RSA operates on `Z_n` |

Two of these are worth calling out.

**A non-coprime `e` means no key pair can be generated.** The congruence
`e·d ≡ 1 (mod φ)` has no solution when `gcd(e, φ) > 1`. An earlier version of
this code searched for `d` and, after 10000 failed attempts, fell back to a
hardcoded `d = 103`. That number is in fact the correct inverse for the default
`p = 11, q = 13, e = 7`, which is why the bug went unnoticed: for any `e`
sharing a factor with `φ`, the UI displayed a private key that mathematically
cannot exist. The app now reports that no private key exists.

**`m ≥ n` cannot be encrypted as a single block.** Since one character is
encrypted as one block, `n` must exceed the character code. With the default
`p = 11, q = 13` we get `n = 143`, `φ = 120`, `d = 103` — small enough to verify
by hand, and large enough for every ASCII character (code 0–127). The
super-encryption page uses `p = 17, q = 19` (`n = 323`) instead, because its LFSR
stage hands RSA hex characters, whose codes run 48–102.

Note that these primes are chosen for legibility, not security. A 143 modulus is
breakable by a child; real deployments use at least 2048 bits.

### LFSR

The all-zero seed is rejected. The zero state is *absorbing*: every new bit
becomes `0 ⊕ 0 = 0`, so the register can never leave it, the keystream stays all
zeros, and "encryption" would return the plaintext unchanged.

The page also reports the register period (`2^L − 1` for a maximal-length
configuration). The taps are `b₁` and `bₙ` as the guide specifies — the
keystream bit is the rightmost bit, and the feedback XORs it with the leftmost
one. With a 4-bit seed that configuration visits all 15 states, which is what
confirms the register is running at full length. A test pins the guide's own
8-cycle table so the taps cannot drift again.

### Caesar and Vigenère

An empty Vigenère key used to become `"A"`, which shifts by zero, so encrypting
with a blank key returned the plaintext and looked like a clean round trip. A
non-numeric Caesar shift used to become `0`, producing the identity cipher for
the same reason. Both are now rejected.

## Tests

`npm test` runs Vitest over the pure cipher utilities. The suite covers round
trips for every cipher, the worked examples from the guides in `docs/`, and
every validation rule listed above. There is no component testing: the cipher
pages are thin wrappers over the utilities, and the tests target the logic
rather than the rendering.
