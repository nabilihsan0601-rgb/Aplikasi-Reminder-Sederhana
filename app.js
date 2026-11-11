/**
 * ==============================================================================
 * APLIKASI TASK MANAGER PENGINGAT DEADLINE
 * Tech Stack: Vanilla HTML, CSS, JavaScript
 * Penyimpanan: LocalStorage Web
 * ==============================================================================
 */

// Kunci penyimpanan LocalStorage
const STORAGE_KEY = 'task_deadline_manager_data';

// State Aplikasi
let tasks = [];
let currentTab = 'active'; // 'active' atau 'completed'

// Referensi Elemen DOM
const taskForm = document.getElementById('taskForm');
const taskTitleInput = document.getElementById('taskTitle');
const taskDescInput = document.getElementById('taskDesc');
const taskDateInput = document.getElementById('taskDate');
const taskTimeInput = document.getElementById('taskTime');
const taskList = document.getElementById('taskList');
const emptyState = document.getElementById('emptyState');
const emptyTitle = document.getElementById('emptyTitle');
const emptyDesc = document.getElementById('emptyDesc');

// Tab & Badge
const tabActive = document.getElementById('tabActive');
const tabCompleted = document.getElementById('tabCompleted');
const badgeActiveCount = document.getElementById('badgeActiveCount');
const badgeCompletedCount = document.getElementById('badgeCompletedCount');

// Statistik
const statActive = document.getElementById('statActive');
const statUrgent = document.getElementById('statUrgent');
const statCompleted = document.getElementById('statCompleted');
const currentDateBadge = document.getElementById('currentDateBadge');
const toastNotification = document.getElementById('toastNotification');

// Bubble Chat Notification (< 1 Jam)
const urgentChatBubble = document.getElementById('urgentChatBubble');
const chatBubbleBody = document.getElementById('chatBubbleBody');
const btnDismissChat = document.getElementById('btnDismissChat');
const btnFocusUrgentTask = document.getElementById('btnFocusUrgentTask');

// State Pelacak Notifikasi Bubble Chat
let currentUrgentTaskId = null;
const dismissedTasks = new Set();
let lastChimeTime = 0;

// ==============================================================================
// 1. INISIALISASI APLIKASI
// ==============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  loadTasksFromStorage();
  setupDatePickers();
  updateCurrentDateDisplay();
  setupEventListeners();
  renderApp();

  // Perbarui kalkulasi deadline setiap 1 menit secara real-time
  setInterval(() => {
    renderApp();
  }, 60000);
}

/**
 * Menyiapkan tanggal default dan batas minimum untuk DatePicker
 */
function setupDatePickers() {
  const now = new Date();
  
  // Format YYYY-MM-DD untuk atribut min dan default
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayString = `${year}-${month}-${day}`;

  // Atur min date agar pengguna tidak memilih tanggal lampau
  taskDateInput.min = todayString;
  taskDateInput.value = todayString;

  // Set default time ke jam 23:59
  taskTimeInput.value = '23:59';
}

/**
 * Menampilkan tanggal saat ini di header
 */
function updateCurrentDateDisplay() {
  const options = { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' };
  const todayFormatted = new Intl.DateTimeFormat('id-ID', options).format(new Date());
  currentDateBadge.textContent = `📅 ${todayFormatted}`;
}

// ==============================================================================
// 2. PENYIMPANAN LOCALSTORAGE
// ==============================================================================
function loadTasksFromStorage() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    tasks = rawData ? JSON.parse(rawData) : [];
  } catch (error) {
    console.error('Gagal membaca data dari LocalStorage:', error);
    tasks = [];
  }
}

function saveTasksToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Gagal menyimpan data ke LocalStorage:', error);
    showToast('Gagal menyimpan data lokal!', true);
  }
}

// ==============================================================================
// 3. EVENT LISTENERS
// ==============================================================================
function setupEventListeners() {
  // Submit Form Tambah Tugas
  taskForm.addEventListener('submit', handleAddTask);

  // Tab Switching
  tabActive.addEventListener('click', () => switchTab('active'));
  tabCompleted.addEventListener('click', () => switchTab('completed'));

  // Bubble Chat Actions
  if (btnDismissChat) {
    btnDismissChat.addEventListener('click', dismissChatBubble);
  }
  if (btnFocusUrgentTask) {
    btnFocusUrgentTask.addEventListener('click', focusUrgentTask);
  }
}

function switchTab(tabName) {
  currentTab = tabName;
  if (tabName === 'active') {
    tabActive.classList.add('active');
    tabCompleted.classList.remove('active');
  } else {
    tabCompleted.classList.add('active');
    tabActive.classList.remove('active');
  }
  renderApp();
}

// ==============================================================================
// 4. LOGIKA TAMBAH & KELOLA TUGAS
// ==============================================================================
function handleAddTask(e) {
  e.preventDefault();

  const title = taskTitleInput.value.trim();
  const desc = taskDescInput.value.trim();
  const date = taskDateInput.value;
  const time = taskTimeInput.value;

  if (!title || !date || !time) {
    showToast('Harap isi semua kolom wajib!', true);
    return;
  }

  // Gabungkan tanggal dan waktu menjadi objek Date
  const deadlineDate = new Date(`${date}T${time}:00`);

  if (isNaN(deadlineDate.getTime())) {
    showToast('Format tanggal/waktu tidak valid!', true);
    return;
  }

  // Objek Tugas Baru
  const newTask = {
    id: 'task_' + Date.now(),
    title: title,
    description: desc,
    date: date,
    time: time,
    deadline: deadlineDate.toISOString(),
    completed: false,
    createdAt: new Date().toISOString()
  };

  tasks.push(newTask);
  saveTasksToStorage();

  // Reset form
  taskForm.reset();
  setupDatePickers(); // kembalikan default hari ini & jam 23:59

  // Jika sedang di tab 'completed', arahkan kembali ke 'active'
  if (currentTab !== 'active') {
    switchTab('active');
  } else {
    renderApp();
  }

  showToast('✅ Tugas berhasil ditambahkan!');
}

/**
 * Tandai tugas selesai atau kembalikan ke aktif (Check-off)
 */
function toggleTaskStatus(taskId) {
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return;

  tasks[taskIndex].completed = !tasks[taskIndex].completed;
  saveTasksToStorage();

  const statusText = tasks[taskIndex].completed 
    ? 'Tugas dipindahkan ke tab "Selesai"' 
    : 'Tugas dikembalikan ke "Tugas Aktif"';

  showToast(`✔️ ${statusText}`);
  renderApp();
}

/**
 * Menghapus tugas
 */
function deleteTask(taskId) {
  if (!confirm('Apakah Anda yakin ingin menghapus tugas ini?')) {
    return;
  }

  tasks = tasks.filter(t => t.id !== taskId);
  saveTasksToStorage();
  showToast('🗑️ Tugas berhasil dihapus');
  renderApp();
}

// ==============================================================================
// 5. KALKULASI DEADLINE & INDIKATOR PERINGATAN VISUAL
// ==============================================================================
/**
 * Menghitung selisih waktu dan menentukan kelas visual indikator
 * @param {string} deadlineISO 
 * @param {boolean} isCompleted 
 * @returns {object} status info
 */
function calculateDeadlineInfo(deadlineISO, isCompleted) {
  if (isCompleted) {
    return {
      cardClass: 'completed',
      badgeClass: 'badge-completed',
      badgeText: '✓ Selesai',
      isUrgent: false,
      isOverdue: false,
      remainingText: 'Selesai'
    };
  }

  const now = new Date();
  const deadline = new Date(deadlineISO);
  const diffMs = deadline.getTime() - now.getTime();

  // 1. Sudah Melewati Deadline (Overdue)
  if (diffMs < 0) {
    return {
      cardClass: 'overdue',
      badgeClass: 'badge-overdue',
      badgeText: '⚠️ Terlewat',
      isUrgent: false,
      isOverdue: true,
      remainingText: 'Waktu deadline telah habis'
    };
  }

  const diffHours = diffMs / (1000 * 60 * 60);
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  // 2. Deadline Mendesak (< 24 Jam) -> Indikator Kemerahan & Pulse
  if (diffHours <= 24) {
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    const timeRemainingStr = hours > 0 
      ? `Tersisa: ${hours} jam ${minutes} mnt` 
      : `Tersisa: ${minutes} menit!`;

    return {
      cardClass: 'urgent',
      badgeClass: 'badge-urgent',
      badgeText: '🔥 < 24 Jam',
      isUrgent: true,
      isOverdue: false,
      remainingText: timeRemainingStr
    };
  }

  // 3. Normal (> 24 Jam)
  const diffDays = Math.ceil(diffHours / 24);
  return {
    cardClass: '',
    badgeClass: 'badge-normal',
    badgeText: '⏳ Aman',
    isUrgent: false,
    isOverdue: false,
    remainingText: `Tersisa: ${diffDays} hari lagi`
  };
}

/**
 * Format tanggal dan waktu menjadi format ramah pengguna Indonesia
 */
function formatDateTime(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-');
  const dateObj = new Date(year, month - 1, day);
  
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(dateObj);

  return `${formattedDate}, pukul ${timeStr} WIB`;
}

// ==============================================================================
// 6. RENDER DATA KE TAMPILAN (UI)
// ==============================================================================
function renderApp() {
  updateStats();
  renderTaskList();
  checkOneHourDeadlines();
}

/**
 * Update Angka Statistik & Tab Badge
 */
function updateStats() {
  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  // Hitung berapa tugas aktif yang mendekati deadline (< 24 jam)
  const urgentCount = activeTasks.filter(t => {
    const info = calculateDeadlineInfo(t.deadline, false);
    return info.isUrgent;
  }).length;

  // Update nilai statistik
  statActive.textContent = activeTasks.length;
  statUrgent.textContent = urgentCount;
  statCompleted.textContent = completedTasks.length;

  // Update badge tab
  badgeActiveCount.textContent = activeTasks.length;
  badgeCompletedCount.textContent = completedTasks.length;
}

/**
 * Render Kartu-Kartu Tugas Sesuai Tab Aktif dan Urutan Deadline
 */
function renderTaskList() {
  taskList.innerHTML = '';

  // Filter tugas sesuai tab yang aktif
  let filteredTasks = tasks.filter(t => {
    return currentTab === 'active' ? !t.completed : t.completed;
  });

  // Pengurutan Dinamis:
  // Tugas Aktif -> Diurutkan berdasarkan deadline terdekat (ascending)
  if (currentTab === 'active') {
    filteredTasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  } else {
    // Tugas Selesai -> Urutkan dari yang paling baru dibuat
    filteredTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Tampilkan Empty State jika kosong
  if (filteredTasks.length === 0) {
    emptyState.classList.remove('hidden');
    if (currentTab === 'active') {
      emptyTitle.textContent = 'Tidak Ada Tugas Aktif';
      emptyDesc.textContent = 'Semua tugas telah selesai atau belum ada tugas yang ditambahkan. Santai sejenak! ☕';
    } else {
      emptyTitle.textContent = 'Belum Ada Tugas Selesai';
      emptyDesc.textContent = 'Selesaikan tugas dari daftar tugas aktif untuk melihatnya di sini.';
    }
    return;
  }

  emptyState.classList.add('hidden');

  // Buat DOM Node untuk setiap kartu tugas
  filteredTasks.forEach(task => {
    const info = calculateDeadlineInfo(task.deadline, task.completed);
    const formattedDeadline = formatDateTime(task.date, task.time);

    const taskCard = document.createElement('div');
    taskCard.className = `task-card ${info.cardClass}`;
    taskCard.id = task.id;

    taskCard.innerHTML = `
      <div class="task-check-wrapper">
        <input 
          type="checkbox" 
          class="task-checkbox" 
          ${task.completed ? 'checked' : ''} 
          title="${task.completed ? 'Batal tandai selesai' : 'Tandai selesai'}"
          onchange="toggleTaskStatus('${task.id}')"
        >
      </div>

      <div class="task-details">
        <div class="task-header">
          <h3 class="task-title">${escapeHTML(task.title)}</h3>
          <span class="status-badge ${info.badgeClass}">${info.badgeText}</span>
        </div>

        ${task.description ? `<p class="task-desc">${escapeHTML(task.description)}</p>` : ''}

        <div class="task-meta">
          <div class="deadline-info">
            <span>📅 Deadline:</span>
            <strong>${formattedDeadline}</strong>
          </div>
          <div class="time-remaining">
            <span>(${info.remainingText})</span>
          </div>
        </div>
      </div>

      <div class="task-actions">
        <button 
          class="btn-icon" 
          onclick="deleteTask('${task.id}')" 
          title="Hapus tugas"
        >
          🗑️
        </button>
      </div>
    `;

    taskList.appendChild(taskCard);
  });
}

// ==============================================================================
// 7. NOTIFIKASI BUBBLE CHAT DEADLINE (< 1 JAM)
// ==============================================================================
/**
 * Mengecek apakah ada tugas aktif yang sisa waktunya <= 1 jam (60 menit)
 */
function checkOneHourDeadlines() {
  if (!urgentChatBubble) return;

  const now = new Date().getTime();
  const ONE_HOUR_MS = 60 * 60 * 1000;

  // Filter tugas aktif yang tersisa <= 1 jam dan belum expired
  const urgentTasks = tasks
    .filter(t => !t.completed)
    .map(t => {
      const diffMs = new Date(t.deadline).getTime() - now;
      return { task: t, diffMs };
    })
    .filter(item => item.diffMs > 0 && item.diffMs <= ONE_HOUR_MS)
    .sort((a, b) => a.diffMs - b.diffMs);

  if (urgentTasks.length === 0) {
    urgentChatBubble.classList.add('hidden');
    currentUrgentTaskId = null;
    return;
  }

  // Ambil tugas yang paling mendesak
  const mostUrgent = urgentTasks[0];
  const urgentTaskId = mostUrgent.task.id;

  // Jika tugas ini sudah pernah ditutup oleh user pada sesi ini, jangan tampilkan lagi
  if (dismissedTasks.has(urgentTaskId)) {
    return;
  }

  currentUrgentTaskId = urgentTaskId;
  const minutesLeft = Math.max(1, Math.ceil(mostUrgent.diffMs / (1000 * 60)));

  // Buat pesan personal bergaya bubble chat
  chatBubbleBody.innerHTML = `
    Halo! Deadline tugas <strong>"${escapeHTML(mostUrgent.task.title)}"</strong> tinggal <strong>${minutesLeft} menit lagi!</strong> Segera selesaikan sebelum terlambat ya. 🔥
  `;

  // Tampilkan bubble chat
  urgentChatBubble.classList.remove('hidden');

  // Putar nada pengingat halus (maksimal sekali tiap 2 menit agar tidak bising)
  const currentTime = Date.now();
  if (currentTime - lastChimeTime > 120000) {
    playChimeSound();
    lastChimeTime = currentTime;
  }
}

/**
 * Menutup / Dismiss bubble chat
 */
function dismissChatBubble() {
  if (currentUrgentTaskId) {
    dismissedTasks.add(currentUrgentTaskId);
  }
  if (urgentChatBubble) {
    urgentChatBubble.classList.add('hidden');
  }
}

/**
 * Aksi tombol "Lihat Tugas" pada Bubble Chat
 */
function focusUrgentTask() {
  if (!currentUrgentTaskId) return;

  // Pastikan berada di tab tugas aktif
  if (currentTab !== 'active') {
    switchTab('active');
  }

  const targetCard = document.getElementById(currentUrgentTaskId);
  if (targetCard) {
    // Gulir halus ke kartu tugas
    targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Tambahkan animasi sorot fokus
    targetCard.classList.remove('task-highlight');
    void targetCard.offsetWidth; // Force CSS reflow
    targetCard.classList.add('task-highlight');

    setTimeout(() => {
      targetCard.classList.remove('task-highlight');
    }, 2500);
  }
}

/**
 * Nada dering notifikasi menggunakan Web Audio API (tanpa butuh aset file mp3 eksternal)
 */
function playChimeSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Dua nada ramah (D5 lalu A5)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // Nada D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // Nada A5

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (err) {
    // Abaikan jika browser membatasi autoplay audio sebelum interaksi pengguna
  }
}

// ==============================================================================
// 8. FUNGSI UTILITAS & HELPER
// ==============================================================================
/**
 * Mencegah XSS injection dari input teks
 */
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

/**
 * Menampilkan Toast Notification Ringan
 */
let toastTimeout;
function showToast(message, isError = false) {
  clearTimeout(toastTimeout);
  toastNotification.textContent = message;
  toastNotification.style.backgroundColor = isError ? '#e11d48' : '#1e293b';
  toastNotification.classList.remove('hidden');

  toastTimeout = setTimeout(() => {
    toastNotification.classList.add('hidden');
  }, 3000);
}

// Expose fungsi ke window untuk kemudahan pemanggilan inline atribut (onclick & onchange)
window.toggleTaskStatus = toggleTaskStatus;
window.deleteTask = deleteTask;
