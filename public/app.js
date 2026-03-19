// === DOM References ===
const homeScreen = document.getElementById("home-screen");
const editorScreen = document.getElementById("editor-screen");
const foldersContainer = document.getElementById("folders-container");
const btnNewFolder = document.getElementById("btn-new-folder");
const btnViewToggle = document.getElementById("btn-view-toggle");
const btnBack = document.getElementById("btn-back");
const breadcrumb = document.getElementById("breadcrumb");
const titleInput = document.getElementById("title");
const textArea = document.getElementById("text");
const saveStatus = document.getElementById("save-status");
const btnAddNote = document.getElementById("btn-add-note");
const sidebarList = document.getElementById("sidebar-list");
const btnToggleSidebar = document.getElementById("btn-toggle-sidebar");
const editorLayout = document.querySelector(".editor-layout");
const btnBold = document.getElementById("btn-bold");
const fontSizeSelect = document.getElementById("font-size-select");
const fontFamilySelect = document.getElementById("font-family-select");
const folderScreen = document.getElementById("folder-screen");
const folderScreenTitle = document.getElementById("folder-screen-title");
const folderSheetsContainer = document.getElementById("folder-sheets-container");
const btnFolderBack = document.getElementById("btn-folder-back");
const btnFolderRename = document.getElementById("btn-folder-rename");
const btnFolderDelete = document.getElementById("btn-folder-delete");
const btnNewSheet = document.getElementById("btn-new-sheet");
const horarioScreen = document.getElementById("horario-screen");
const btnHorario = document.getElementById("btn-horario");
const btnHorarioBack = document.getElementById("btn-horario-back");
const horarioGrid = document.getElementById("horario-grid");
const modalOverlay = document.getElementById("horario-modal-overlay");
const modalTitle = document.getElementById("modal-title");
const modalFolder = document.getElementById("modal-folder");
const modalDay = document.getElementById("modal-day");
const modalStart = document.getElementById("modal-start");
const modalEnd = document.getElementById("modal-end");
const modalSalon = document.getElementById("modal-salon");
const modalNotas = document.getElementById("modal-notas");
const btnModalClose = document.getElementById("btn-modal-close");
const btnModalSave = document.getElementById("btn-modal-save");
const btnModalDelete = document.getElementById("btn-modal-delete");
const confirmModalOverlay = document.getElementById("confirm-modal-overlay");
const confirmModalTitle = document.getElementById("confirm-modal-title");
const confirmModalMessage = document.getElementById("confirm-modal-message");
const btnConfirmClose = document.getElementById("btn-confirm-close");
const btnConfirmCancel = document.getElementById("btn-confirm-cancel");
const btnConfirmOk = document.getElementById("btn-confirm-ok");
const folderModalOverlay = document.getElementById("folder-modal-overlay");
const folderModalTitle = document.getElementById("folder-modal-title");
const folderModalName = document.getElementById("folder-modal-name");
const btnFolderModalClose = document.getElementById("btn-folder-modal-close");
const btnFolderModalSave = document.getElementById("btn-folder-modal-save");
const folderIconPicker = document.getElementById("folder-icon-picker");

let saveTimer = null;
let currentSheetId = null;
let currentFolder = null;
let horarioEntries = [];
let horarioFolders = [];
let editingEntryId = null;
let folderModalCallback = null;
let editingFolderId = null;
let selectedFolderIcon = "folder";

const FOLDER_ICONS = [
  "folder", "school", "science", "calculate", "history_edu",
  "menu_book", "auto_stories", "biotech", "psychology", "language",
  "translate", "music_note", "palette", "sports_soccer", "fitness_center",
  "computer", "code", "terminal", "architecture", "engineering",
  "account_balance", "gavel", "health_and_safety", "medication",
  "eco", "public", "groups", "work", "business_center", "lightbulb",
];
let currentView = localStorage.getItem("folder-view") || "grid";

const SUBJECT_COLORS = [
  "#1a73e8", "#e8710a", "#137333", "#9334e6",
  "#c5221f", "#007b83", "#b06000", "#185abc",
  "#e52592", "#0d652d", "#7627bb", "#b31412"
];
const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DAY_KEYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const START_HOUR = 6;
const END_HOUR = 18;

// === Screen Navigation ===

function hideAllScreens() {
  homeScreen.classList.add("hidden");
  folderScreen.classList.add("hidden");
  editorScreen.classList.add("hidden");
  horarioScreen.classList.add("hidden");
}

function showHome() {
  currentSheetId = null;
  currentFolder = null;
  clearTimeout(saveTimer);
  hideAllScreens();
  homeScreen.classList.remove("hidden");
  loadFolders();
}

function showFolderView(folder) {
  currentFolder = folder;
  hideAllScreens();
  folderScreen.classList.remove("hidden");
  folderScreenTitle.textContent = folder.name;
  folderScreen.querySelector(".topbar-icon").textContent = folder.icon || "folder";
  loadSheets(folder.id, folder.name, folderSheetsContainer);
}

function showEditor(sheetId, folderName) {
  currentSheetId = sheetId;
  hideAllScreens();
  editorScreen.classList.remove("hidden");
  breadcrumb.textContent = folderName;
  loadSheet(sheetId);
}

function showHorario() {
  hideAllScreens();
  horarioScreen.classList.remove("hidden");
  loadHorario();
}

// === Date Formatting ===

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }) + " " + date.toLocaleTimeString("es-ES", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

// === FOLDERS ===

async function loadFolders() {
  try {
    const res = await fetch("/api/folders");
    const data = await res.json();
    renderFolders(data.folders);
  } catch {}
}

function renderFolders(folders) {
  foldersContainer.innerHTML = "";
  if (folders.length === 0) {
    const msg = document.createElement("div");
    msg.className = "empty-message";
    msg.innerHTML = '<span class="material-icons-outlined">folder_open</span>No hay carpetas. Crea una para comenzar.';
    foldersContainer.appendChild(msg);
    return;
  }
  folders.forEach((folder) => {
    const card = document.createElement("div");
    card.className = "folder-card";
    card.innerHTML = `
      <div class="folder-header">
        <span class="material-icons-outlined folder-card-icon">${folder.icon || "folder"}</span>
        <span class="folder-name">${escapeHtml(folder.name)}</span>
      </div>
    `;
    card.addEventListener("click", () => showFolderView(folder));
    foldersContainer.appendChild(card);
  });
}

function openFolderModal(title, initialName, initialIcon, callback) {
  folderModalTitle.textContent = title;
  folderModalName.value = initialName || "";
  selectedFolderIcon = initialIcon || "folder";
  folderModalCallback = callback;
  renderIconPicker();
  folderModalOverlay.classList.remove("hidden");
  folderModalName.focus();
}

function renderIconPicker() {
  folderIconPicker.innerHTML = "";
  FOLDER_ICONS.forEach((icon) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "icon-picker-item" + (icon === selectedFolderIcon ? " selected" : "");
    btn.innerHTML = `<span class="material-icons-outlined">${icon}</span>`;
    btn.addEventListener("click", () => {
      selectedFolderIcon = icon;
      folderIconPicker.querySelectorAll(".icon-picker-item").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
    });
    folderIconPicker.appendChild(btn);
  });
}

function closeFolderModal() {
  folderModalOverlay.classList.add("hidden");
  folderModalCallback = null;
  editingFolderId = null;
}

async function saveFolderModal() {
  const name = folderModalName.value.trim();
  if (!name) return;
  if (folderModalCallback) {
    await folderModalCallback(name, selectedFolderIcon);
  }
  closeFolderModal();
}

// === Confirm Dialog ===
function confirmDialog(title, message) {
  return new Promise((resolve) => {
    confirmModalTitle.textContent = title;
    confirmModalMessage.textContent = message;
    confirmModalOverlay.classList.remove("hidden");

    function close(result) {
      confirmModalOverlay.classList.add("hidden");
      btnConfirmOk.removeEventListener("click", onOk);
      btnConfirmCancel.removeEventListener("click", onCancel);
      btnConfirmClose.removeEventListener("click", onCancel);
      confirmModalOverlay.removeEventListener("click", onOverlay);
      resolve(result);
    }

    function onOk() { close(true); }
    function onCancel() { close(false); }
    function onOverlay(e) { if (e.target === confirmModalOverlay) close(false); }

    btnConfirmOk.addEventListener("click", onOk);
    btnConfirmCancel.addEventListener("click", onCancel);
    btnConfirmClose.addEventListener("click", onCancel);
    confirmModalOverlay.addEventListener("click", onOverlay);
  });
}

function createFolder() {
  openFolderModal("Nueva carpeta", "", "folder", async (name, icon) => {
    try {
      await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, icon }),
      });
      loadFolders();
    } catch {}
  });
}

function renameFolder(folder) {
  openFolderModal("Editar carpeta", folder.name, folder.icon || "folder", async (name, icon) => {
    if (name === folder.name && icon === (folder.icon || "folder")) return;
    try {
      await fetch("/api/folders/" + folder.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, icon }),
      });
      folder.name = name;
      folder.icon = icon;
      if (currentFolder && currentFolder.id === folder.id) {
        folderScreenTitle.textContent = name;
        folderScreen.querySelector(".topbar-icon").textContent = icon;
      }
    } catch {}
  });
}

async function deleteFolder(folderId) {
  const ok = await confirmDialog("Eliminar carpeta", "¿Eliminar esta carpeta y todas sus hojas?");
  if (!ok) return;
  try {
    await fetch("/api/folders/" + folderId, { method: "DELETE" });
    showHome();
  } catch {}
}

// === SHEETS ===

async function loadSheets(folderId, folderName, container) {
  try {
    const res = await fetch("/api/folders/" + folderId + "/sheets");
    const data = await res.json();
    renderSheets(data.sheets, folderId, folderName, container);
  } catch {}
}

function renderSheets(sheets, folderId, folderName, container) {
  container.innerHTML = "";
  sheets.forEach((sheet) => {
    const item = document.createElement("div");
    item.className = "sheet-item";
    item.innerHTML = `
      <div class="sheet-title">${escapeHtml(sheet.title || "Sin titulo")}</div>
      ${sheet.lastSaved ? `<div class="sheet-date">${formatDate(sheet.lastSaved)}</div>` : '<div class="sheet-date">Nuevo</div>'}
      <button class="btn-delete-sheet" title="Eliminar hoja">
        <span class="material-icons-outlined">close</span>
      </button>
    `;
    item.addEventListener("click", (e) => {
      if (e.target.closest(".btn-delete-sheet")) return;
      showEditor(sheet.id, folderName);
    });
    item.querySelector(".btn-delete-sheet").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteSheet(sheet.id, folderId, folderName, container);
    });
    container.appendChild(item);
  });
  if (sheets.length === 0) {
    const msg = document.createElement("div");
    msg.className = "empty-message";
    msg.innerHTML = '<span class="material-icons-outlined">description</span>No hay hojas. Crea una para comenzar.';
    container.appendChild(msg);
  }
}

async function createSheet(folderId, folderName, container) {
  try {
    const res = await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId }),
    });
    const data = await res.json();
    if (data.ok) {
      showEditor(data.sheet.id, folderName);
    }
  } catch {}
}

async function deleteSheet(sheetId, folderId, folderName, container) {
  const ok = await confirmDialog("Eliminar hoja", "¿Eliminar esta hoja?");
  if (!ok) return;
  try {
    await fetch("/api/sheets/" + sheetId, { method: "DELETE" });
    loadSheets(folderId, folderName, container);
  } catch {}
}

// === EDITOR: Auto-save ===

function setSaveStatus(icon, state, tooltip) {
  saveStatus.querySelector(".material-icons-outlined").textContent = icon;
  saveStatus.className = "toolbar-save-icon " + state;
  saveStatus.title = tooltip;
}

function onInputChange() {
  if (!currentSheetId) return;
  setSaveStatus("cloud_sync", "saving", "Guardando...");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveSheet, 2000);
}

titleInput.addEventListener("input", onInputChange);
textArea.addEventListener("input", onInputChange);

async function saveSheet() {
  if (!currentSheetId) return;
  try {
    const res = await fetch("/api/sheets/" + currentSheetId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleInput.value, text: textArea.innerHTML }),
    });
    const data = await res.json();
    if (data.ok) {
      setSaveStatus("cloud_done", "saved", "Guardado: " + formatDate(data.lastSaved));
    } else {
      throw new Error();
    }
  } catch {
    setSaveStatus("cloud_off", "error", "Error al guardar");
  }
}

async function loadSheet(sheetId) {
  try {
    const res = await fetch("/api/sheets/" + sheetId);
    const sheet = await res.json();
    titleInput.value = sheet.title || "";
    let content = sheet.text || "";
    if (content && !/<[a-z][\s\S]*>/i.test(content)) {
      content = escapeHtml(content).replace(/\n/g, "<br>");
    }
    textArea.innerHTML = content;
    if (sheet.lastSaved) {
      setSaveStatus("cloud_done", "saved", "Guardado: " + formatDate(sheet.lastSaved));
    } else {
      setSaveStatus("cloud_off", "", "Sin guardar");
    }
    renderSidebarNotes(sheet.sidebarNotes || []);
  } catch {}
}

// === EDITOR: Sidebar Notes ===

function renderSidebarNotes(notes) {
  sidebarList.innerHTML = "";
  notes.forEach((note) => {
    sidebarList.appendChild(renderSidebarNote(note));
  });
  updateEmptyMessage();
}

function linkifyText(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  let result = "";
  let lastIndex = 0;
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    result += escapeHtml(text.slice(lastIndex, match.index));
    const safeUrl = escapeHtml(match[1]);
    result += `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="note-link">${safeUrl}</a>`;
    lastIndex = urlRegex.lastIndex;
  }
  result += escapeHtml(text.slice(lastIndex));
  return result;
}

function renderSidebarNote(note) {
  const li = document.createElement("li");
  li.className = "sidebar-note";
  li.dataset.id = note.id;

  const span = document.createElement("span");
  span.className = "note-text";
  span.innerHTML = linkifyText(note.text);

  li.appendChild(span);

  const btn = document.createElement("button");
  btn.className = "btn-delete";
  btn.innerHTML = '<span class="material-icons-outlined">close</span>';
  btn.title = "Eliminar nota";
  btn.addEventListener("click", () => deleteSidebarNote(note.id, li));

  li.appendChild(btn);
  return li;
}

function updateEmptyMessage() {
  const existing = sidebarList.querySelector(".sidebar-empty");
  const isEmpty = sidebarList.querySelectorAll(".sidebar-note").length === 0;
  sidebarList.classList.toggle("empty", isEmpty);
  if (isEmpty) {
    if (!existing) {
      const msg = document.createElement("li");
      msg.className = "sidebar-empty";
      msg.innerHTML = '<span class="material-icons-outlined">bookmark_border</span>Selecciona texto y presiona Ctrl+Enter';
      sidebarList.appendChild(msg);
    }
  } else if (existing) {
    existing.remove();
  }
}

async function addSidebarNote() {
  if (!currentSheetId) return;
  const sel = window.getSelection();
  const selected = sel.rangeCount > 0 ? sel.toString().trim() : "";
  if (!selected) {
    btnAddNote.style.borderColor = "#d93025";
    btnAddNote.style.color = "#d93025";
    setTimeout(() => { btnAddNote.style.borderColor = ""; btnAddNote.style.color = ""; }, 800);
    return;
  }
  try {
    const res = await fetch("/api/sheets/" + currentSheetId + "/sidebar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: selected }),
    });
    const data = await res.json();
    if (data.ok) {
      const emptyMsg = sidebarList.querySelector(".sidebar-empty");
      if (emptyMsg) emptyMsg.remove();
      sidebarList.appendChild(renderSidebarNote(data.note));
    }
  } catch {}
}

async function deleteSidebarNote(noteId, li) {
  if (!currentSheetId) return;
  try {
    const res = await fetch("/api/sheets/" + currentSheetId + "/sidebar/" + noteId, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) {
      li.remove();
      updateEmptyMessage();
    }
  } catch {}
}

// === Formatting Toolbar ===

btnBold.addEventListener("click", (e) => {
  e.preventDefault();
  document.execCommand("bold", false, null);
  textArea.focus();
  updateToolbarState();
  onInputChange();
});

fontSizeSelect.addEventListener("change", () => {
  const size = fontSizeSelect.value;
  document.execCommand("fontSize", false, "7");
  textArea.querySelectorAll('font[size="7"]').forEach(el => {
    const span = document.createElement("span");
    span.style.fontSize = size + "px";
    span.innerHTML = el.innerHTML;
    el.replaceWith(span);
  });
  textArea.focus();
  onInputChange();
});

fontFamilySelect.addEventListener("change", () => {
  document.execCommand("fontName", false, fontFamilySelect.value);
  textArea.focus();
  onInputChange();
});

function updateToolbarState() {
  const isBold = document.queryCommandState("bold");
  btnBold.classList.toggle("active", isBold);

  const fontName = document.queryCommandValue("fontName");
  if (fontName) {
    const clean = fontName.replace(/['"]/g, "");
    const opt = fontFamilySelect.querySelector(`option[value="${clean}"]`);
    if (opt) fontFamilySelect.value = clean;
  }

  const sel = window.getSelection();
  if (sel.rangeCount > 0) {
    const node = sel.anchorNode?.parentElement;
    if (node && textArea.contains(node)) {
      const computed = parseFloat(window.getComputedStyle(node).fontSize);
      const rounded = Math.round(computed);
      const opt = fontSizeSelect.querySelector(`option[value="${rounded}"]`);
      if (opt) fontSizeSelect.value = rounded;
    }
  }
}

document.addEventListener("selectionchange", () => {
  if (document.activeElement === textArea) {
    updateToolbarState();
  }
});

// Clean empty contenteditable so placeholder shows
textArea.addEventListener("input", () => {
  if (textArea.innerHTML === "<br>") textArea.innerHTML = "";
});

// === HORARIO ===

function getFolderColor(folderId) {
  const idx = horarioFolders.findIndex(f => f.id === folderId);
  return SUBJECT_COLORS[Math.max(0, idx) % SUBJECT_COLORS.length];
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function migrateOldFormat(data) {
  if (data.entries) return data.entries;
  if (!data.schedule) return [];
  const schedule = data.schedule;
  const grouped = {};
  for (const [key, folderId] of Object.entries(schedule)) {
    const [day, hourStr] = key.split("-");
    const hour = parseInt(hourStr);
    const gKey = `${day}-${folderId}`;
    if (!grouped[gKey]) grouped[gKey] = { day, folderId, hours: [] };
    grouped[gKey].hours.push(hour);
  }
  const entries = [];
  for (const g of Object.values(grouped)) {
    g.hours.sort((a, b) => a - b);
    let start = g.hours[0];
    let prev = start;
    for (let i = 1; i <= g.hours.length; i++) {
      if (i < g.hours.length && g.hours[i] === prev + 1) {
        prev = g.hours[i];
      } else {
        entries.push({
          id: generateId(),
          day: g.day,
          startHour: start,
          endHour: prev + 1,
          folderId: g.folderId,
          salon: "",
          notas: ""
        });
        if (i < g.hours.length) { start = g.hours[i]; prev = start; }
      }
    }
  }
  return entries;
}

async function loadHorario() {
  try {
    const [foldersRes, horarioRes] = await Promise.all([
      fetch("/api/folders"),
      fetch("/api/horario")
    ]);
    const foldersData = await foldersRes.json();
    const horarioJson = await horarioRes.json();
    horarioFolders = foldersData.folders;
    horarioEntries = migrateOldFormat(horarioJson);
    if (horarioJson.schedule && !horarioJson.entries) {
      await saveHorario();
    }
    populateModalHours();
    renderHorario();
  } catch (err) {
    console.error("Error loading horario:", err);
  }
}

function populateModalHours() {
  modalStart.innerHTML = "";
  modalEnd.innerHTML = "";
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    const label = `${h}:00`;
    modalStart.appendChild(new Option(label, h));
    modalEnd.appendChild(new Option(label, h));
  }
}

function renderHorario() {
  horarioGrid.innerHTML = "";

  const corner = document.createElement("div");
  corner.className = "horario-header corner";
  corner.style.gridColumn = 1;
  corner.style.gridRow = 1;
  horarioGrid.appendChild(corner);

  DAYS.forEach((day, i) => {
    const header = document.createElement("div");
    header.className = "horario-header";
    header.textContent = day;
    header.style.gridColumn = i + 2;
    header.style.gridRow = 1;
    horarioGrid.appendChild(header);
  });

  for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
    const row = hour - START_HOUR + 2;
    const timeCell = document.createElement("div");
    timeCell.className = "horario-time";
    timeCell.textContent = `${hour}:00`;
    timeCell.style.gridColumn = 1;
    timeCell.style.gridRow = row;
    horarioGrid.appendChild(timeCell);

    DAY_KEYS.forEach((dayKey, di) => {
      const cell = document.createElement("div");
      cell.className = "horario-cell";
      cell.dataset.day = dayKey;
      cell.dataset.hour = hour;
      cell.style.gridColumn = di + 2;
      cell.style.gridRow = row;
      cell.addEventListener("click", () => openModal(null, dayKey, hour));
      horarioGrid.appendChild(cell);
    });
  }

  horarioEntries.forEach(entry => {
    const folder = horarioFolders.find(f => f.id === entry.folderId);
    if (!folder) return;
    const col = DAY_KEYS.indexOf(entry.day) + 2;
    const rowStart = entry.startHour - START_HOUR + 2;
    const rowSpan = entry.endHour - entry.startHour;

    const block = document.createElement("div");
    block.className = "horario-block";
    block.style.gridColumn = col;
    block.style.gridRow = `${rowStart} / span ${rowSpan}`;
    block.style.backgroundColor = getFolderColor(entry.folderId);
    block.innerHTML = `<div class="block-name">${escapeHtml(folder.name)}</div>`
      + (entry.salon ? `<div class="block-detail">${escapeHtml(entry.salon)}</div>` : "");
    block.addEventListener("click", (e) => {
      e.stopPropagation();
      openModal(entry);
    });
    horarioGrid.appendChild(block);
  });
}

function populateModalFolders(selectedId) {
  modalFolder.innerHTML = "";
  horarioFolders.forEach(f => {
    modalFolder.appendChild(new Option(f.name, f.id));
  });
  modalFolder.appendChild(new Option("+ Nueva materia...", "__new__"));
  if (selectedId) modalFolder.value = selectedId;
  else if (horarioFolders.length > 0) modalFolder.value = horarioFolders[0].id;
}

function openModal(entry, day, hour) {
  populateModalFolders(entry ? entry.folderId : null);

  if (entry) {
    editingEntryId = entry.id;
    modalTitle.textContent = "Editar clase";
    modalDay.value = entry.day;
    modalStart.value = entry.startHour;
    modalEnd.value = entry.endHour;
    modalSalon.value = entry.salon || "";
    modalNotas.value = entry.notas || "";
    btnModalDelete.classList.remove("hidden");
  } else {
    editingEntryId = null;
    modalTitle.textContent = "Nueva clase";
    modalDay.value = day || DAY_KEYS[0];
    modalStart.value = hour || START_HOUR;
    modalEnd.value = (hour || START_HOUR) + 1;
    modalSalon.value = "";
    modalNotas.value = "";
    btnModalDelete.classList.add("hidden");
  }

  modalOverlay.classList.remove("hidden");
}

function closeModal() {
  modalOverlay.classList.add("hidden");
  editingEntryId = null;
}

function hasOverlap(day, startHour, endHour, excludeId) {
  return horarioEntries.some(e =>
    e.day === day &&
    e.id !== excludeId &&
    startHour < e.endHour &&
    endHour > e.startHour
  );
}

async function saveEntry() {
  const folderId = modalFolder.value;
  if (!folderId) return;
  const day = modalDay.value;
  const startHour = parseInt(modalStart.value);
  const endHour = parseInt(modalEnd.value);
  const salon = modalSalon.value.trim();
  const notas = modalNotas.value.trim();

  if (endHour <= startHour) {
    alert("La hora fin debe ser mayor que la hora inicio.");
    return;
  }

  if (hasOverlap(day, startHour, endHour, editingEntryId)) {
    alert("Hay un traslape con otra clase en ese horario.");
    return;
  }

  if (editingEntryId) {
    const entry = horarioEntries.find(e => e.id === editingEntryId);
    if (entry) {
      entry.folderId = folderId;
      entry.day = day;
      entry.startHour = startHour;
      entry.endHour = endHour;
      entry.salon = salon;
      entry.notas = notas;
    }
  } else {
    horarioEntries.push({
      id: generateId(),
      day, startHour, endHour, folderId, salon, notas
    });
  }

  closeModal();
  renderHorario();
  await saveHorario();
}

async function deleteEntry() {
  if (!editingEntryId) return;
  horarioEntries = horarioEntries.filter(e => e.id !== editingEntryId);
  closeModal();
  renderHorario();
  await saveHorario();
}

async function saveHorario() {
  try {
    await fetch("/api/horario", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: horarioEntries }),
    });
  } catch (err) {
    console.error("Error saving horario:", err);
  }
}

// === View Toggle ===

function setView(view) {
  currentView = view;
  localStorage.setItem("folder-view", view);
  foldersContainer.className = "folders-container view-" + view;
  btnViewToggle.querySelector(".material-icons-outlined").textContent =
    view === "grid" ? "view_list" : "grid_view";
  btnViewToggle.title = view === "grid" ? "Vista lista" : "Vista cuadrícula";
}

// === Event Listeners ===

btnNewFolder.addEventListener("click", createFolder);
btnBack.addEventListener("click", () => {
  if (currentFolder) {
    showFolderView(currentFolder);
  } else {
    showHome();
  }
});
btnFolderBack.addEventListener("click", showHome);
btnFolderRename.addEventListener("click", () => {
  if (currentFolder) renameFolder(currentFolder);
});
btnFolderDelete.addEventListener("click", () => {
  if (currentFolder) deleteFolder(currentFolder.id);
});
btnNewSheet.addEventListener("click", () => {
  if (currentFolder) createSheet(currentFolder.id, currentFolder.name, folderSheetsContainer);
});
btnViewToggle.addEventListener("click", () => {
  setView(currentView === "grid" ? "list" : "grid");
});
btnAddNote.addEventListener("click", addSidebarNote);
btnToggleSidebar.addEventListener("click", toggleSidebar);
btnHorario.addEventListener("click", showHorario);
btnHorarioBack.addEventListener("click", showHome);
btnModalClose.addEventListener("click", closeModal);
btnModalSave.addEventListener("click", saveEntry);
btnModalDelete.addEventListener("click", deleteEntry);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});
btnFolderModalClose.addEventListener("click", closeFolderModal);
btnFolderModalSave.addEventListener("click", saveFolderModal);
folderModalOverlay.addEventListener("click", (e) => {
  if (e.target === folderModalOverlay) closeFolderModal();
});
folderModalName.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); saveFolderModal(); }
});
modalFolder.addEventListener("change", () => {
  if (modalFolder.value === "__new__") {
    openFolderModal("Nueva materia", "", "folder", async (name, icon) => {
      try {
        const res = await fetch("/api/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, icon }),
        });
        const data = await res.json();
        if (data.ok) {
          horarioFolders.push(data.folder);
          populateModalFolders(data.folder.id);
        }
      } catch {}
    });
  }
});

function toggleSidebar() {
  editorLayout.classList.toggle("sidebar-collapsed");
  const collapsed = editorLayout.classList.contains("sidebar-collapsed");
  btnToggleSidebar.querySelector(".material-icons-outlined").textContent =
    collapsed ? "vertical_split" : "vertical_split";
  btnToggleSidebar.title = collapsed ? "Mostrar notas" : "Ocultar notas";
  localStorage.setItem("sidebar-collapsed", collapsed);
}

// Restore sidebar state
if (localStorage.getItem("sidebar-collapsed") === "true") {
  editorLayout.classList.add("sidebar-collapsed");
  btnToggleSidebar.title = "Mostrar notas";
}

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter") {
    e.preventDefault();
    addSidebarNote();
  }
});

// === Utils ===

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// === Init ===

document.addEventListener("DOMContentLoaded", () => {
  setView(currentView);
  showHome();
});
