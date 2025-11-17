// Editor de capítulos Getalis – integração com Supabase
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://cfomvzomzqfbfxrttymz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmb212em9tenFmYmZ4cnR0eW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMzM4MzYsImV4cCI6MjA3ODgwOTgzNn0.UbxU61ug7SWsQFvY8xWZ77L0NIEzp7k-mxoISFS1UEo";

// TODO: substitua pelas suas credenciais reais
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const state = {
  currentChapterId: null,
  chapters: []
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  setupLogin();
  setupEditorActions();
  initAuthState();
});

// =====================
// ELEMENTOS
// =====================

function cacheElements() {
  els.viewLogin = document.getElementById("view-login");
  els.viewEditor = document.getElementById("view-editor");

  // login
  els.loginForm = document.getElementById("login-form");
  els.loginEmail = document.getElementById("login-email");
  els.loginPassword = document.getElementById("login-password");
  els.loginMessage = document.getElementById("login-message");

  // editor
  els.btnLogout = document.getElementById("btn-logout");
  els.btnNew = document.getElementById("btn-new-chapter");
  els.btnSave = document.getElementById("btn-save");
  els.btnDuplicate = document.getElementById("btn-duplicate");
  els.btnDelete = document.getElementById("btn-delete");

  els.chaptersList = document.getElementById("chapters-list");
  els.chaptersCount = document.getElementById("chapters-count");
  els.editorStatusLabel = document.getElementById("editor-status-label");
  els.chapterStatusPill = document.getElementById("chapter-status-pill");
  els.saveInfo = document.getElementById("save-info");

  // form fields
  els.form = document.getElementById("chapter-form");
  els.fieldTitle = document.getElementById("field-title");
  els.fieldSlug = document.getElementById("field-slug");
  els.fieldDate = document.getElementById("field-date");
  els.fieldStatus = document.getElementById("field-status");
  els.fieldOrder = document.getElementById("field-order");
  els.fieldHero = document.getElementById("field-hero");
  els.fieldContent = document.getElementById("field-content");
}

// =====================
// AUTH
// =====================

function setupLogin() {
  if (!els.loginForm) return;

  els.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    els.loginMessage.textContent = "Autenticando...";
    const email = els.loginEmail.value.trim();
    const password = els.loginPassword.value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error(error);
      els.loginMessage.textContent = "Erro ao entrar: " + error.message;
      return;
    }

    els.loginMessage.textContent = "Login bem-sucedido. Carregando editor...";
    await initAuthState(); // força checar sessão
  });
}

function initAuthState() {
  return supabase.auth.getSession().then(({ data }) => {
    const session = data.session;
    if (session) {
      showEditorView();
      loadChapters();
    } else {
      showLoginView();
    }
  });
}

function showLoginView() {
  els.viewLogin.classList.remove("view-hidden");
  els.viewEditor.classList.add("view-hidden");
}

function showEditorView() {
  els.viewLogin.classList.add("view-hidden");
  els.viewEditor.classList.remove("view-hidden");
}

function setupEditorActions() {
  if (els.btnLogout) {
    els.btnLogout.addEventListener("click", async () => {
      await supabase.auth.signOut();
      state.currentChapterId = null;
      state.chapters = [];
      clearForm();
      renderChaptersList();
      showLoginView();
    });
  }

  if (els.btnNew) {
    els.btnNew.addEventListener("click", () => {
      state.currentChapterId = null;
      clearForm(true);
      updateStatusLabels();
      highlightSelectedChapter(null);
    });
  }

  if (els.form) {
    els.form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await saveChapter();
    });
  }

  if (els.btnDuplicate) {
    els.btnDuplicate.addEventListener("click", () => {
      duplicateChapter();
    });
  }

  if (els.btnDelete) {
    els.btnDelete.addEventListener("click", async () => {
      if (!state.currentChapterId) {
        alert("Nenhum capítulo selecionado para excluir.");
        return;
      }
      const ok = confirm("Tem certeza que deseja excluir este capítulo?");
      if (!ok) return;
      await deleteChapter();
    });
  }

  if (els.fieldTitle && els.fieldSlug) {
    els.fieldTitle.addEventListener("blur", () => {
      if (!els.fieldSlug.value.trim()) {
        els.fieldSlug.value = slugify(els.fieldTitle.value);
      }
    });
  }
}

// =====================
// CHAPTER CRUD
// =====================

async function loadChapters() {
  els.editorStatusLabel.textContent = "Carregando capítulos...";
  els.saveInfo.textContent = "";

  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: true, nullsFirst: true });

  if (error) {
    console.error(error);
    els.editorStatusLabel.textContent = "Erro ao carregar capítulos.";
    return;
  }

  state.chapters = data || [];
  renderChaptersList();

  if (!state.currentChapterId && state.chapters.length > 0) {
    selectChapter(state.chapters[0].id);
  } else if (state.currentChapterId) {
    // recarregar capítulo selecionado
    const chapter = state.chapters.find((c) => c.id === state.currentChapterId);
    if (chapter) {
      fillForm(chapter);
    } else {
      state.currentChapterId = null;
      clearForm(true);
    }
  }

  updateStatusLabels();
}

function renderChaptersList() {
  if (!els.chaptersList) return;
  els.chaptersList.innerHTML = "";
  els.chaptersCount.textContent = `${state.chapters.length} capítulo(s)`;

  state.chapters.forEach((cap) => {
    const li = document.createElement("li");
    li.className = "editor-list-item";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "editor-chapter-btn";
    btn.dataset.id = cap.id;

    const main = document.createElement("div");
    main.className = "editor-chapter-btn-main";

    const title = document.createElement("div");
    title.className = "editor-chapter-btn-title";
    title.textContent = cap.title;

    const date = document.createElement("div");
    date.className = "editor-chapter-btn-date";
    date.textContent = cap.published_at
      ? new Date(cap.published_at).toLocaleDateString("pt-BR")
      : "Sem data";

    main.appendChild(title);
    main.appendChild(date);

    const statusBadge = document.createElement("span");
    statusBadge.className = "chapter-badge";
    statusBadge.textContent = cap.status || "NOVO";

    btn.appendChild(main);
    btn.appendChild(statusBadge);

    btn.addEventListener("click", () => {
      selectChapter(cap.id);
    });

    li.appendChild(btn);
    els.chaptersList.appendChild(li);
  });

  highlightSelectedChapter(state.currentChapterId);
}

function selectChapter(chapterId) {
  const cap = state.chapters.find((c) => c.id === chapterId);
  if (!cap) return;
  state.currentChapterId = chapterId;
  fillForm(cap);
  highlightSelectedChapter(chapterId);
  updateStatusLabels();
}

function highlightSelectedChapter(chapterId) {
  const buttons = document.querySelectorAll(".editor-chapter-btn");
  buttons.forEach((btn) => {
    if (btn.dataset.id === chapterId) {
      btn.classList.add("selected");
    } else {
      btn.classList.remove("selected");
    }
  });
}

function fillForm(cap) {
  els.fieldTitle.value = cap.title || "";
  els.fieldSlug.value = cap.slug || "";
  els.fieldStatus.value = cap.status || "NOVO";
  els.fieldOrder.value = cap.sort_order ?? 0;
  els.fieldHero.value = cap.hero_image_url || "";
  els.fieldContent.value = cap.content || "";

  if (cap.published_at) {
    const d = new Date(cap.published_at);
    els.fieldDate.value = d.toISOString().slice(0, 10);
  } else {
    els.fieldDate.value = "";
  }
}

function clearForm(resetStatus = false) {
  els.fieldTitle.value = "";
  els.fieldSlug.value = "";
  els.fieldDate.value = "";
  els.fieldStatus.value = "NOVO";
  els.fieldOrder.value = 0;
  els.fieldHero.value = "";
  els.fieldContent.value = "";

  if (resetStatus) {
    els.saveInfo.textContent = "";
  }
}

async function saveChapter() {
  const title = els.fieldTitle.value.trim();
  const slug = els.fieldSlug.value.trim();
  const status = els.fieldStatus.value;
  const order = parseInt(els.fieldOrder.value || "0", 10);
  const hero = els.fieldHero.value.trim();
  const content = els.fieldContent.value;

  if (!title || !slug) {
    alert("Título e slug são obrigatórios.");
    return;
  }

  let published_at = null;
  if (els.fieldDate.value) {
    published_at = new Date(els.fieldDate.value).toISOString();
  }

  const payload = {
    title,
    slug,
    status,
    sort_order: order,
    hero_image_url: hero || null,
    content,
    published_at
  };

  els.saveInfo.textContent = "Salvando...";

  let error;
  if (state.currentChapterId) {
    const { error: err } = await supabase
      .from("chapters")
      .update(payload)
      .eq("id", state.currentChapterId);
    error = err;
  } else {
    const { data, error: err } = await supabase
      .from("chapters")
      .insert(payload)
      .select()
      .single();
    error = err;
    if (!error && data) {
      state.currentChapterId = data.id;
    }
  }

  if (error) {
    console.error(error);
    els.saveInfo.textContent = "Erro ao salvar: " + error.message;
    return;
  }

  els.saveInfo.textContent = "Salvo ✔";
  setTimeout(() => (els.saveInfo.textContent = ""), 2000);

  await loadChapters();
}

function duplicateChapter() {
  if (!state.currentChapterId) {
    alert("Selecione um capítulo para duplicar.");
    return;
  }
  const cap = state.chapters.find((c) => c.id === state.currentChapterId);
  if (!cap) return;

  state.currentChapterId = null;
  els.fieldTitle.value = cap.title + " (cópia)";
  els.fieldSlug.value = slugify(cap.slug + "-copia-" + Math.floor(Math.random() * 999));
  els.fieldStatus.value = cap.status || "RASCUNHO";
  els.fieldOrder.value = (cap.sort_order ?? 0) + 1;
  els.fieldHero.value = cap.hero_image_url || "";
  els.fieldContent.value = cap.content || "";
  els.fieldDate.value = "";

  updateStatusLabels();
}

async function deleteChapter() {
  const id = state.currentChapterId;
  if (!id) return;

  els.saveInfo.textContent = "Excluindo...";

  const { error } = await supabase.from("chapters").delete().eq("id", id);
  if (error) {
    console.error(error);
    els.saveInfo.textContent = "Erro ao excluir: " + error.message;
    return;
  }

  els.saveInfo.textContent = "Excluído ✔";
  state.currentChapterId = null;
  clearForm(true);
  await loadChapters();
}

function updateStatusLabels() {
  if (!state.currentChapterId) {
    els.editorStatusLabel.textContent = "Nenhum capítulo selecionado. Crie ou escolha um capítulo na lista.";
    els.chapterStatusPill.style.display = "none";
    return;
  }

  const cap = state.chapters.find((c) => c.id === state.currentChapterId);
  if (!cap) return;

  els.editorStatusLabel.textContent = `Editando: ${cap.title}`;
  els.chapterStatusPill.textContent = cap.status || "NOVO";
  els.chapterStatusPill.style.display = "inline-flex";
}

// =====================
// UTIL
// =====================

function slugify(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
