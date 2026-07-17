# Rencana Optimasi Performa Kuesioner (PetugasQuestionnaire.jsx)

Dokumen ini berisi panduan dan rencana implementasi (Implementation Plan) untuk memperbaiki isu *lag* atau performa lambat saat petugas mengisi kuesioner, terutama pada bagian yang memiliki banyak *looping* (seperti Blok 4).

---

## 1. Menerapkan `React.memo` pada Komponen Pertanyaan (Prioritas Utama)
**Akar Masalah:** Saat ini, setiap kali nilai satu input berubah (misal diketik), state global `ans.values` diperbarui. Hal ini memicu *render* ulang pada *seluruh* komponen input yang ada di layar, yang sangat membebani CPU perangkat *low-end*.

**Tujuan:** Mencegah render ulang pada pertanyaan yang tidak berubah nilainya.

**Langkah Implementasi:**
- Pisahkan kode yang me-render isi pertanyaan menjadi komponen terpisah (misal `QuestionItem`).
- Bungkus komponen tersebut dengan `React.memo` dan *custom equality function* untuk memastikan komponen hanya di-render ulang jika spesifik `value` atau status `skip`-nya berubah.

**Contoh Kode:**
```javascript
import React, { memo } from 'react';

// 1. Buat komponen terpisah
const QuestionItem = memo(({ 
  question, 
  value, // Hanya kirim spesifik ans.values[question.id], JANGAN kirim seluruh ans.values
  loopIndex, 
  onChange, 
  isActiveSkip 
}) => {
  return (
    <QCard>
       {/* Isi render pertanyaan (DebouncedInput, FastSelect, dll) di sini */}
    </QCard>
  );
}, (prevProps, nextProps) => {
  // 2. Custom comparison: Hanya re-render JIKA nilai value atau status skip berubah
  return (
    prevProps.value === nextProps.value &&
    prevProps.isActiveSkip === nextProps.isActiveSkip &&
    prevProps.loopIndex === nextProps.loopIndex
  );
});
```

---

## 2. Mengubah UI Looping (Khusus Manual Loop / Tambah Isian) menjadi Mode Tab
**Akar Masalah:** Jika petugas menambahkan banyak anggota (misal 15 anggota) secara manual, dan tiap anggota punya 10 pertanyaan, maka React harus me-render 150 elemen input memanjang ke bawah. Ini menyebabkan *DOM Bloat*.

**Catatan Penting (Pengecualian):**
- **Looping Manual (Tombol Tambah Isian Baru):** Terapkan mode Tab/Accordion.
- **Looping Berdasarkan Input (Otomatis):** Biarkan seperti semula (memanjang ke bawah). Jika loop otomatis memanjang (misal input angka 5 -> muncul 5 loop), UI tetap dibiarkan karena biasanya jumlahnya statis sesuai input dan agar petugas lebih cepat melihat seluruh isian tanpa harus berpindah tab.

**Tujuan:** Mengurangi jumlah *Node DOM* yang tampil di layar secara bersamaan khusus untuk list dinamis yang ditambahkan manual oleh petugas.

**Langkah Implementasi:**
- Buat *state* aktif untuk iterasi saat ini khusus di blok rendering Manual Loop:
  ```javascript
  const [activeLoopIndex, setActiveLoopIndex] = useState(0);
  ```
- Buat UI antarmuka berupa deretan tombol tab (horizontal scrollable) (misal: "Isian 1", "Isian 2").
- Letakkan tombol "Tambah Isian Baru" di ujung kanan deretan tab tersebut.
- Modifikasi blok *mapping* perulangan manual agar hanya me-render komponen input JIKA iterasi indeksnya sama dengan `activeLoopIndex`.
- Ketika petugas menambah isian baru via `handleAddManualLoop`, arahkan `activeLoopIndex` secara otomatis ke indeks isian yang baru dibuat.

### Refinement UX (Pengalaman Pengguna) untuk Mode Tab
Untuk menghindari kebingungan petugas di lapangan, berikut adalah detail UX yang harus diterapkan pada Mode Tab:

**a. Posisi Tombol "Tambah Baru" (Menghindari Scroll ke Atas)**
- Selain tombol `[ + ]` di deretan tab atas, tambahkan juga **satu tombol besar di bagian paling bawah** dari *form* tab yang sedang aktif (tepat di atas tombol navigasi antar-blok).
- Labelnya: `[ + Tambah Isian Baru ]`. Ketika diklik, sistem akan langsung membuat tab baru dan menggeser layar/fokus ke tab tersebut.

**b. Perilaku Tombol Navigasi Bawah (Selanjutnya / Sebelumnya)**
Tombol navigasi di bawah harus cerdas menyesuaikan konteks tab:
- **Jika bukan di Tab Terakhir:** Tombol kanan berbunyi `[ Selanjutnya: Isian Ke-2 ➔ ]` (bertindak untuk berpindah ke tab sebelahnya).
- **Jika berada di Tab Terakhir:** Tombol kanan berbunyi `[ Lanjut Ke Blok Berikutnya ➔ ]` (bertindak untuk pindah blok seperti biasa).
*(Ini membuat alur pengisian petugas tetap mengalir dari atas ke bawah).*

**c. Penamaan Judul Tab yang Fleksibel**
Karena *looping* manual tidak selalu "Anggota", kita bisa menggunakan 3 strategi penamaan:
1. **Fallback (Paling Aman):** Gunakan kata generik: `[ Isian 1 ]`, `[ Isian 2 ]`, atau `[ Data 1 ]`.
2. **Berdasarkan Konfigurasi (Metadata):** Jika di file JSON validasi/pertanyaan terdapat field seperti `loop_group` atau `sub_label` (misal `"sub_label": "Usaha"`), gunakan teks tersebut: `[ Usaha 1 ]`, `[ Usaha 2 ]`.
3. **Berdasarkan Jawaban (Paling UX Friendly):** Ambil nilai dari *pertanyaan pertama* di loop tersebut (biasanya adalah Nama). Jika petugas sudah mengisi "Budi", judul tab berubah dari `[ Isian 1 ]` menjadi `[ 1. Budi ]`. Jika masih kosong, tetap `[ Isian 1 ]`. 
   *(**Penting:** Untuk mencegah UI tab rusak karena nama yang dimasukkan terlalu panjang, batasi panjang teks judul maksimal misal 15 karakter dan gunakan CSS `text-overflow: ellipsis`. Contoh jika nama adalah "Toko Makmur Jaya Abadi", tab hanya akan menampilkan `[ 1. Toko Makmur Ja... ]` agar tampilan tetap rapi).*

---

## 3. Isolasi Render Per-Blok (Lazy/Unmount Inactive Blocks)
**Akar Masalah:** Terkadang, form yang panjang menggunakan CSS `display: none` untuk menyembunyikan blok yang tidak aktif, yang berarti komponen-komponen tersebut tetap di-render dan dikalkulasi di latar belakang.

**Tujuan:** Menghindari kalkulasi dan *rendering* memori untuk blok (seperti Blok 1, 2, 3) ketika petugas sedang fokus mengisi Blok 4.

**Langkah Implementasi:**
- Saat melakukan *mapping* `blocks.map`, pastikan Anda benar-benar tidak me-render isi blok jika bukan blok aktif.
  ```javascript
  {blocks.map(block => {
      // HANYA render pertanyaan jika blok ini adalah blok yang sedang aktif
      if (activeTab !== block.id) return null; 
      
      return (
          <div key={block.id}>
              {/* Render pertanyaan blok ini */}
          </div>
      )
  })}
  ```

---

## 4. Optimasi Kalkulasi `activeSkipsMemo` (Tingkat Lanjut)
**Akar Masalah:** Hook `activeSkipsMemo` mengevaluasi fungsi JSON.parse dan Regex *skip_logic* untuk seluruh form setiap kali ada satu tombol/input ditekan (karena *dependency array*-nya adalah `ans.values`).

**Tujuan:** Mengurangi CPU *overhead* di *background* setiap kali pengguna mengetik.

**Langkah Implementasi:**
- **Solusi Cepat:** Ubah filter pengecekan *skip logic* agar **hanya mengevaluasi pertanyaan-pertanyaan yang ada di Blok aktif saat ini**. Jika pertanyaan *skip target* ada di blok lain, asumsikan state-nya tersimpan di *cache* atau hitung terpisah saat blok tersebut dibuka.
- **Solusi Ideal:** Buat *Dependency Graph* saat aplikasi pertama kali dimuat. Sehingga ketika ID Pertanyaan X berubah, sistem hanya memverifikasi *skip logic* untuk ID Pertanyaan Y (yang memang bergantung pada X), alih-alih mengecek dari awal sampai akhir.

---

*Silakan mulai dengan mengimplementasikan Poin 1 (React.memo) dan Poin 3 (Isolasi Blok) terlebih dahulu, karena keduanya memiliki usaha (effort) paling sedikit namun akan memberikan dampak peningkatan performa yang paling signifikan.*
