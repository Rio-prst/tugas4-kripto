# Panduan Implementasi: LFSR (Linear Feedback Shift Register)

## 1. Konsep Dasar
LFSR adalah pembangkit aliran bit acak semu (*Pseudo-Random Keystream Generator*) yang digunakan dalam **Stream Cipher (Cipher Aliran)**[cite: 5]. LFSR bekerja berbasis bit menggunakan register geser dan fungsi umpan balik beroperasi bitwise XOR ($\oplus$)[cite: 5].

## 2. Arsitektur & Prinsip Kerja
- Memiliki register berukuran $n$-bit (misal: 4-bit, 8-bit)[cite: 5].
- Pada setiap siklus/detak clock:
  1. Bit paling kanan ($b_1$) dikeluarkan sebagai bit *keystream*[cite: 5].
  2. Bit umpan balik baru dihitung dengan meng-XOR-kan bit-bit tertentu (*tap positions*)[cite: 5].
  3. Seluruh bit di dalam register digeser ke kanan 1 posisi[cite: 5].
  4. Bit umpan balik dimasukkan ke posisi paling kiri ($b_n$)[cite: 5].

## 3. Rumus & Operasi
- **Fungsi Umpan Balik (contoh 4-bit standar):**
  $$b_{\text{feedback}} = b_1 \oplus b_4$$
[cite: 5]
- **Enkripsi:**
  $$C_i = P_i \oplus K_i$$
[cite: 5]
- **Dekripsi:**
  $$P_i = C_i \oplus K_i$$
[cite: 5]

## 4. Contoh Perhitungan Manual
- **Seed/Inisialisasi Register (4-bit):** `1111` ($b_4 b_3 b_2 b_1$)[cite: 5]
- **Fungsi Taps:** $b_1 \oplus b_4$[cite: 5]
- **Plaintext (Binary/ASCII):** Karakter `'e'` = `01100101`[cite: 5]

### Pembangkitan Keystream 8-bit:
- **Siklus 1:** Register `1111` $\rightarrow$ Out = `1`, Feed = $1 \oplus 1 = 0 \rightarrow$ Next Reg: `0111`[cite: 5]
- **Siklus 2:** Register `0111` $\rightarrow$ Out = `1`, Feed = $1 \oplus 0 = 1 \rightarrow$ Next Reg: `1011`[cite: 5]
- **Siklus 3:** Register `1011` $\rightarrow$ Out = `1`, Feed = $1 \oplus 1 = 0 \rightarrow$ Next Reg: `0101`[cite: 5]
- **Siklus 4:** Register `0101` $\rightarrow$ Out = `1`, Feed = $1 \oplus 0 = 1 \rightarrow$ Next Reg: `1010`[cite: 5]
- **Siklus 5:** Register `1010` $\rightarrow$ Out = `0`, Feed = $0 \oplus 1 = 1 \rightarrow$ Next Reg: `1101`[cite: 5]
- **Siklus 6:** Register `1101` $\rightarrow$ Out = `1`, Feed = $1 \oplus 1 = 0 \rightarrow$ Next Reg: `0110`[cite: 5]
- **Siklus 7:** Register `0110` $\rightarrow$ Out = `0`, Feed = $0 \oplus 0 = 0 \rightarrow$ Next Reg: `0011`[cite: 5]
- **Siklus 8:** Register `0011` $\rightarrow$ Out = `1`, Feed = $1 \oplus 0 = 1 \rightarrow$ Next Reg: `1001`[cite: 5]
- **Keystream Terbentuk:** `11110101`[cite: 5]

### Enkripsi XOR:
```text
  Plaintext ('e'): 01100101
  Keystream      : 11110101
  ------------------------- (XOR)
  Ciphertext     : 10010000
```[cite: 5]

## 5. Instruksi Pengembangan untuk AI Agent
1. Konversi *string input* menjadi biner/array bit (ASCII/UTF-8).
2. Buat kelas/fungsi `LFSRGenerator(seed: string, taps: number[])` untuk menghasilkan bit *keystream*.
3. Lakukan operasi XOR bitwise antara bit *plaintext* dan *keystream*.
4. Kembalikan *ciphertext* dalam format Hexadecimal atau Base64 agar dapat dibaca dengan aman di UI.