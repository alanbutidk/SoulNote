document.addEventListener("DOMContentLoaded", () => {

  let notes = JSON.parse(localStorage.getItem("soulnotes")) || [
    { id: 1, heading: "Welcome to SoulNote", text: "Press Ctrl+O to create a new note." }
  ];

  let activeNote = null;

  function save() {
    localStorage.setItem("soulnotes", JSON.stringify(notes));
  }

  function openModal(note) {
    activeNote = note;
    document.getElementById("modal-heading").value = note.heading;
    document.getElementById("modal-body").value = note.text;
    document.getElementById("modal-overlay").classList.add("open");
    setTimeout(() => document.getElementById("modal-body").focus(), 100);
  }

  function closeModal() {
    document.getElementById("modal-overlay").classList.remove("open");
    activeNote = null;
  }

  function saveAndClose() {
    if (!activeNote) return;
    activeNote.heading = document.getElementById("modal-heading").value || "Untitled";
    activeNote.text = document.getElementById("modal-body").value;
    save();
    render();
    closeModal();
  }

  function render() {
    const container = document.getElementById("container");
    container.innerHTML = "";

    notes.forEach(note => {
      const box = document.createElement("div");
      box.classList.add("clickable");
      box.innerHTML = `
        <div class="note-preview">
          <h1>${note.heading}</h1>
          <p>${note.text || "Empty note..."}</p>
        </div>
        <span class="delete-btn" title="Delete">✕</span>
      `;

      box.querySelector(".note-preview").addEventListener("click", () => openModal(note));

      box.querySelector(".delete-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        notes = notes.filter(n => n.id !== note.id);
        save();
        render();
      });

      container.appendChild(box);
    });
  }

  // Add button
  document.getElementById("add-btn").addEventListener("click", () => {
    const note = { id: Date.now(), heading: "New Note", text: "" };
    notes.push(note);
    save();
    render();
    openModal(note);
  });

  // BG color persist
  const savedBg = localStorage.getItem("soulnotes-bg");
  if (savedBg) {
    document.documentElement.style.setProperty("--bg-color", savedBg);
    document.getElementById("bg-color-picker").value = savedBg;
  }

  document.getElementById("bg-color-picker").addEventListener("input", (e) => {
    document.documentElement.style.setProperty("--bg-color", e.target.value);
    localStorage.setItem("soulnotes-bg", e.target.value);
  });

  // Watermark toggle persist
  const watermarkHidden = localStorage.getItem("soulnotes-watermark") === "false";
  if (watermarkHidden) {
    document.getElementById("watermark").classList.add("hidden");
    document.getElementById("watermark-toggle").checked = false;
  }

  document.getElementById("watermark-toggle").addEventListener("change", (e) => {
    const show = e.target.checked;
    document.getElementById("watermark").classList.toggle("hidden", !show);
    localStorage.setItem("soulnotes-watermark", show);
  });

  // Settings toggle
  document.getElementById("settings-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("settings-panel").classList.toggle("open");
  });

  document.addEventListener("click", () => {
    document.getElementById("settings-panel").classList.remove("open");
  });

  document.getElementById("settings-panel").addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Modal buttons
  document.getElementById("modal-save").addEventListener("click", saveAndClose);
  document.getElementById("modal-close").addEventListener("click", saveAndClose);
  document.getElementById("modal-discard").addEventListener("click", closeModal);

  document.getElementById("modal-overlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) saveAndClose();
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    const modalOpen = document.getElementById("modal-overlay").classList.contains("open");

    if (e.ctrlKey && e.key === "o") {
      e.preventDefault();
      const note = { id: Date.now(), heading: "New Note", text: "" };
      notes.push(note);
      save();
      render();
      openModal(note);
    }

    if (!modalOpen) return;

    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      saveAndClose();
    }
    if (e.ctrlKey && e.key === "k") {
      e.preventDefault();
      saveAndClose();
    }
    if (e.ctrlKey && e.key === "d") {
      e.preventDefault();
      closeModal();
    }
  });

  render();

});