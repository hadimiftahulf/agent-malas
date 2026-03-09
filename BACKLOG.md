# Backlog: Agent Males (AI Worker Agent)

Agent ini bertugas sebagai _AI Developer/Worker_ yang secara otomatis mengambil task dari GitHub Project, mengerjakannya, dan menangani _feedback_ dari Pull Request. Arsitektur agent ini akan dipelajari dan diadaptasi dari `review-agent` yang sudah ada, namun dengan fokus untuk _writing code_ alih-alih hanya _reviewing_.

## 📌 Epics & Tasks

### 1. Integrasi Task Assignment (GitHub Project)

- [ ] **Setup GitHub API/GraphQL:** Konfigurasi autentikasi untuk membaca board GitHub Project.
- [ ] **Polling/Webhook Task Baru:** Mendeteksi ketika ada task baru yang masuk ke kolom _To Do_ / _Ready for Dev_.
- [ ] **Git Automation Flow:**
  - `git pull` repository.
  - Membuat branch baru berdasarkan ID/Nama Task (contoh: `feature/TASK-123`).
- [ ] **Task Execution (Core AI Processing):** Membaca deskripsi task, mencari konteks di codebase, lalu memanggil LLM (Gemini/OpenAI/Claude) untuk generate/edit kode.
- [ ] **PR Creation & Assignment:**
  - Melakukan `git add`, `git commit` dengan format konvensional (semantic commits).
  - Push branch ke remote origin.
  - Membuat Pull Request (PR) otomatis via GitHub API/CLI.
  - Assign PR ke reviewer secara spesifik (secara default di-assign ke `@vheins`).

### 2. Handling Feedback / Rejected PRs

- [ ] **Monitor PR Status:** Mendengarkan event (webhook/polling) untuk setiap instruksi _Request Changes_ atau komentar baru.
- [ ] **Comment Analysis:** Mengekstrak konteks dari komentar reviewer (memahami file mana yang harus diubah, baris ke berapa, dan apa arahannya).
- [ ] **Auto-Fixing Workflows:**
  - Checkout kembali ke branch PR terkait.
  - Membaca revisi yang diminta dan mengaplikasikan perubahan menggunakan LLM.
- [ ] **Push & Update PR:**
  - Melakukan _commit_ perbaikan.
  - _Push_ kembali ke branch PR asal.
  - Menulis komentar balasan otomatis pada PR (contoh: "Perbaikan telah dicommit berdasarkan instruksi. Mohon di-review kembali!").

### 3. Ide Fitur Lanjutan (Agar Lebih Powerful)

- [ ] **Pre-PR Testing & Self-Healing:** Menjalankan `yarn build`, linting, atau unit test secara lokal sebelum membuat PR. Jika gagal (error), agent akan membaca _stack trace_ dan melakukan _self-healing_ (memperbaiki _bug_ secara mandiri sebelum lanjut membuat PR).
- [ ] **Context Fetching (Codebase RAG):** Untuk codebase besar, agent akan mencari referensi dan desain arsitektur dalam repo (mirip Vector Search/RAG) agar _coding style_-nya konsisten dengan proyek eksisting tanpa merusak _dependency_.
- [ ] **Conflict Resolution System:** Jika ada merge conflict dengan `main`, agent dapat me-resolve conflict-nya sendiri dengan membuat PR terpisah berisi _conflict fix_.
- [ ] **Daily Standup / Summary Report:** Agent merangkum otomatis pekerjaannya per hari (contoh: "Hari ini menyelesaikan 3 task dan merevisi 2 PR") dan memposting report-nya ke whatsApp menggunakan fontte.
- [ ] **Security Scanning (Pre-commit):** Memastikan kode hasil tangkapan AI bersih dari _hardcoded credential_ (API keys, secrets) dan kerentanan dasar sebelum di-push.
