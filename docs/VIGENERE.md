# Panduan Implementasi: Vigenère Cipher

## 1. Konsep Dasar
Vigenère Cipher adalah algoritma kriptografi klasik berbasis **Substitusi Polialfabetik**[cite: 1]. Algoritma ini menggunakan kata kunci (*key string*) yang diulang secara periodik sepanjang teks asli untuk menentukan pergeseran karakter[cite: 1].

## 2. Pemetaan & Pemodelan Karakter
- Alfabet dipetakan dari **0 hingga 25** ($A=0, B=1, \dots, Z=25$)[cite: 1].
- Kunci disesuaikan panjangnya dengan *plaintext* dengan cara diulang (*repeated key*)[cite: 1]. Karakter non-alfabet pada plaintext tidak mengonsumsi huruf kunci.

## 3. Rumus Matematis
### Enkripsi
$$C_i = (P_i + K_i) \bmod 26$$
[cite: 1]

### Dekripsi
$$P_i = (C_i - K_i) \bmod 26$$
*Catatan Implementasi:*
$$P_i = ((C_i - K_i) \bmod 26 + 26) \bmod 26$$

## 4. Contoh Perhitungan Manual
- **Plaintext ($P$):** `TEKNIK`
- **Key ($K$):** `MAJU` $\rightarrow$ disesuaikan menjadi `MAJUMA`

### Enkripsi:
1. `T` (19) + `M` (12) = $(19 + 12) \bmod 26 = 31 \bmod 26 = 5 \rightarrow$ **F**
2. `E` (4) + `A` (0) = $(4 + 0) \bmod 26 = 4 \rightarrow$ **E**
3. `K` (10) + `J` (9) = $(10 + 9) \bmod 26 = 19 \rightarrow$ **T**
4. `N` (13) + `U` (20) = $(13 + 20) \bmod 26 = 33 \bmod 26 = 7 \rightarrow$ **H**
5. `I` (8) + `M` (12) = $(8 + 12) \bmod 26 = 20 \rightarrow$ **U**
6. `K` (10) + `A` (0) = $(10 + 0) \bmod 26 = 10 \rightarrow$ **K**
- **Ciphertext:** `FETHUK`

## 5. Instruksi Pengembangan untuk AI Agent
1. Buat fungsi helper untuk menyelaraskan panjang *key* terhadap *plaintext*.
2. Buat fungsi `encryptVigenere(plaintext: string, key: string): string`.
3. Buat fungsi `decryptVigenere(ciphertext: string, key: string): string`.
4. Sediakan *trace steps* berisi tabel pasangan per karakter untuk visualisasi UI.