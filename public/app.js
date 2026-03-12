// === DOM References ===
const homeScreen = document.getElementById("home-screen");
const editorScreen = document.getElementById("editor-screen");
const foldersContainer = document.getElementById("folders-container");
const btnNewFolder = document.getElementById("btn-new-folder");
const btnBack = document.getElementById("btn-back");
const breadcrumb = document.getElementById("breadcrumb");
const titleInput = document.getElementById("title");
const textArea = document.getElementById("text");
const saveStatus = document.getElementById("save-status");
const btnAddNote = document.getElementById("btn-add-note");
const sidebarList = document.getElementById("sidebar-list");
const btnToggleSidebar = document.getElementById("btn-toggle-sidebar");
const editorLayout = document.querySelector(".editor-layout");

let saveTimer = null;
let currentSheetId = null;

// === Screen Navigation ===

function showHome() {
  currentSheetId = null;
  clearTimeout(saveTimer);
  editorScreen.classList.add("hidden");
  homeScreen.classList.remove("hidden");
  loadFolders();
}

function showEditor(sheetId, folderName) {
  currentSheetId = sheetId;
  homeScreen.classList.add("hidden");
  editorScreen.classList.remove("hidden");
  breadcrumb.textContent = folderName;
  loadSheet(sheetId);
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
        <span class="folder-name">
          <span class="material-icons-outlined">folder</span>
          ${escapeHtml(folder.name)}
        </span>
        <div class="folder-actions">
          <button class="icon-btn btn-rename-folder" title="Renombrar">
            <span class="material-icons-outlined">edit</span>
          </button>
          <button class="icon-btn danger btn-delete-folder" title="Eliminar">
            <span class="material-icons-outlined">delete</span>
          </button>
        </div>
      </div>
      <div class="sheets-list" data-folder-id="${folder.id}"></div>
    `;
    card.querySelector(".btn-rename-folder").addEventListener("click", (e) => {
      e.stopPropagation();
      renameFolder(folder);
    });
    card.querySelector(".btn-delete-folder").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteFolder(folder.id);
    });
    foldersContainer.appendChild(card);
    loadSheets(folder.id, folder.name, card.querySelector(".sheets-list"));
  });
}

async function createFolder() {
  const name = prompt("Nombre de la carpeta:");
  if (!name || !name.trim()) return;
  try {
    await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    loadFolders();
  } catch {}
}

async function renameFolder(folder) {
  const name = prompt("Nuevo nombre:", folder.name);
  if (!name || !name.trim() || name.trim() === folder.name) return;
  try {
    await fetch("/api/folders/" + folder.id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    loadFolders();
  } catch {}
}

async function deleteFolder(folderId) {
  if (!confirm("Eliminar esta carpeta y todas sus hojas?")) return;
  try {
    await fetch("/api/folders/" + folderId, { method: "DELETE" });
    loadFolders();
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
  const btn = document.createElement("button");
  btn.className = "btn-new-sheet";
  btn.innerHTML = '<span class="material-icons-outlined">add</span>Nueva hoja';
  btn.addEventListener("click", () => createSheet(folderId, folderName, container));
  container.appendChild(btn);
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
  if (!confirm("Eliminar esta hoja?")) return;
  try {
    await fetch("/api/sheets/" + sheetId, { method: "DELETE" });
    loadSheets(folderId, folderName, container);
  } catch {}
}

// === EDITOR: Auto-save ===

function onInputChange() {
  if (!currentSheetId) return;
  saveStatus.textContent = "Guardando...";
  saveStatus.className = "save-status saving";
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
      body: JSON.stringify({ title: titleInput.value, text: textArea.value }),
    });
    const data = await res.json();
    if (data.ok) {
      saveStatus.textContent = "Guardado: " + formatDate(data.lastSaved);
      saveStatus.className = "save-status saved";
    } else {
      throw new Error();
    }
  } catch {
    saveStatus.textContent = "Error al guardar";
    saveStatus.className = "save-status error";
  }
}

async function loadSheet(sheetId) {
  try {
    const res = await fetch("/api/sheets/" + sheetId);
    const sheet = await res.json();
    titleInput.value = sheet.title || "";
    textArea.value = sheet.text || "";
    if (sheet.lastSaved) {
      saveStatus.textContent = "Guardado: " + formatDate(sheet.lastSaved);
      saveStatus.className = "save-status saved";
    } else {
      saveStatus.textContent = "Sin guardar";
      saveStatus.className = "save-status";
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

function renderSidebarNote(note) {
  const li = document.createElement("li");
  li.className = "sidebar-note";
  li.dataset.id = note.id;

  const span = document.createElement("span");
  span.className = "note-text";
  span.textContent = note.text;

  const btn = document.createElement("button");
  btn.className = "btn-delete";
  btn.innerHTML = '<span class="material-icons-outlined">close</span>';
  btn.title = "Eliminar nota";
  btn.addEventListener("click", () => deleteSidebarNote(note.id, li));

  li.appendChild(span);
  li.appendChild(btn);
  return li;
}

function updateEmptyMessage() {
  const existing = sidebarList.querySelector(".sidebar-empty");
  if (sidebarList.querySelectorAll(".sidebar-note").length === 0) {
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
  const selected = textArea.value.substring(textArea.selectionStart, textArea.selectionEnd).trim();
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

// === Event Listeners ===

btnNewFolder.addEventListener("click", createFolder);
btnBack.addEventListener("click", showHome);
btnAddNote.addEventListener("click", addSidebarNote);
btnToggleSidebar.addEventListener("click", toggleSidebar);

function toggleSidebar() {
  editorLayout.classList.toggle("sidebar-collapsed");
  const collapsed = editorLayout.classList.contains("sidebar-collapsed");
  btnToggleSidebar.querySelector(".material-icons-outlined").textContent =
    collapsed ? "side_navigation" : "side_navigation";
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
  showHome();
});
