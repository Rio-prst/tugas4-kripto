# KryptoLearn

A Next.js app that shows how classical and modern ciphers actually work, by
running them in the browser and displaying the state at every step instead of
just the final answer.

| Page | What it shows |
| --- | --- |
| `/caesar` | Per-character alphabet index, shift, and wraparound |
| `/vigenere` | Key alignment, repeated key, and per-character addition mod 26 |
| `/lfsr` | Register state at every shift, the tap XOR, and the generated keystream |
| `/aes` | Full Rijndael round-by-round state matrices and the expanded key schedule |
| `/rsa` | Per-character modular exponentiation and the key derivation |
| `/super-encryption` | All four chained, with each intermediate layer |

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

## Known limitations

These are deliberate, and worth knowing before drawing conclusions from the app.

### AES runs in ECB mode, and that is not a production choice

AES only *defines* the block cipher. The block cipher is not a mode of
operation, and this app uses ECB, the one mode with no chaining.

ECB encrypts every block independently, so **the same 16-byte plaintext block
always produces the same ciphertext block** under the same key. Encrypt a
document containing repeated structure and the repetition survives into the
ciphertext in plain sight. The "All blocks" panel on the AES page is there
precisely so this is visible rather than merely described: feed it a repeated
block and the repeated output appears.

CBC, CTR, or GCM would fix this. They are not implemented, and adding one is a
change in behaviour, not a setting. Treat the AES page as a visualisation of the
Rijndael round function, not as a usable encryption scheme.

The RSA page has the same problem for a different reason: the default primes
give a modulus of 143, small enough to factor by hand. That is on purpose, so
the arithmetic can be checked by hand, but it is not encryption in any sense.

### The LFSR only handles byte-sized characters

Each character is converted to 8 bits, and only 8 bits of the keystream are
generated per character. That is fine for every code point from 0 to 255.

Above that, the conversion pads the binary form to 8 characters and then reads
only those 8, so **the leading bits are kept and the trailing bits are silently
discarded**. `U+0100` (256) becomes `0b10000000`, that is 128, not 0. The page
does not warn about this, because the input is usually plain text; it only
surfaces if you paste an unusual character into it.

The truncation is one-way, so text that came out of the LFSR is always safe to
feed back in.

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
super-encryption page uses `p = 17, q = 19` (`n = 323`) instead, because its
input is LFSR output, which is a raw byte in `0–255` rather than typed text.

Note that these primes are chosen for legibility, not security. A 143 modulus is
breakable by a child; real deployments use at least 2048 bits.

### LFSR

The all-zero seed is rejected. The zero state is *absorbing*: every new bit
becomes `0 ⊕ 0 = 0`, so the register can never leave it, the keystream stays all
zeros, and "encryption" would return the plaintext unchanged.

The page also reports the register period (`2^L − 1` for a maximal-length
configuration). With a 4-bit seed and the `(L−1, L−2)` tap, all 15 states are
visited, which confirms the register is running at full length.

Encryption and decryption are the same operation here, since XOR with a
keystream is its own inverse. No rewind of the register is involved: the
function always starts from the seed, so running the identical keystream over
the ciphertext a second time already returns the plaintext. That is what the
round-trip test in `lfsrCipher.test.ts` asserts.

### Caesar and Vigenère

An empty Vigenère key used to become `"A"`, which shifts by zero, so encrypting
with a blank key returned the plaintext and looked like a clean round trip. A
non-numeric Caesar shift used to become `0`, producing the identity cipher for
the same reason. Both are now rejected.

### AES

AES only defines key sizes of 128, 192, and 256 bits, so keys must be 16, 24, or
32 bytes. The key is measured in bytes rather than string characters, so a key
containing non-ASCII characters is not silently accepted at the wrong size.

The page encrypts to one long hexadecimal string, so decryption expects
hexadecimal back, with no spaces and no `0x` prefix. See the note on ECB above
for why the mode is worth knowing about.

## Tests

`npm test` runs Vitest over the pure cipher utilities. The suite covers round
trips for every cipher, the published AES vectors from FIPS-197 Appendix A, B
and C, and every validation rule listed above. There is no component testing:
the cipher pages are thin wrappers over the utilities, and the tests target the
logic rather than the rendering.

