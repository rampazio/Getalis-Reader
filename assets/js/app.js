// Getalis Reader – Cliente público (capítulos via Supabase)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("[Getalis Reader] app.js carregado");

// ===============================
// CONFIG SUPABASE
// ===============================
const SUPABASE_URL = "https://cfomvzomzqfbfxrttymz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmb212em9tenFmYmZ4cnR0eW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMzM4MzYsImV4cCI6MjA3ODgwOTgzNn0.UbxU61ug7SWsQFvY8xWZ77L0NIEzp7k-mxoISFS1UEo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================
// ESTADO / ELEMENTOS
// ===============================
let CAPITULOS = [];

const GLOSSARIO = {
  nevoa: {
    titulo: "Névoa",
    resumo: "A Névoa é a força misteriosa que separa mundos e transforma aqueles que a atravessam.",
    descricao:
      "A Névoa é uma entidade quase viva, um fenômeno arcano que envolve Getalis e outros mundos. É responsável pelas Marcas, desaparecimentos e sussurros que muitos chamam de loucura.",
  },
  sangreal: {
    titulo: "Sangreal",
    resumo: "Antiga linhagem marcada pela lua, ligada ao sangue e ao sacrifício.",
    descricao:
      "A linhagem Sangreal carrega uma marca herdada, passada de geração em geração. Seus portadores possuem habilidades físicas superiores e uma relação íntima com a escuridão e a lua, em troca de maldições profundas.",
  },
  getalis: {
    titulo: "Getalis",
    resumo: "O mundo para onde a Névoa conduz aqueles que ousam atravessá-la.",
    descricao:
      "Getalis é um mundo fragmentado entre reinos, desertos e mares. Aqui se erguem países como Kalimar, Olira, Oduska e Oligateca, cada um com seus conflitos, magias e segredos.",
  },
};

const state = {
  currentChapterIndex: 0,
  baseFontSize: 18,
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  console.log("[Getalis Reader] DOM pronto");
  cacheElements();
  setupGlobalUI();
  loadInitialData();
});

// ===============================
// CACHE DE ELEMENTOS
// ===============================
function cacheElements() {
  els.chapterSelect = document.getElementById("chapter-select");
  els.chaptersList = document.getElementById("chapters-list");
  els.chaptersCounter = document.getElementById("chapters-counter");
  els.chaptersPanel = document.querySelector(".chapters-panel");   // ← NOVO
  els.chaptersToggle = document.getElementById("chapters-toggle"); // ← NOVO

  els.readerTitle = document.getElementById("reader-title");
  els.readerMeta = document.getElementById("reader-meta");
  els.readerContent = document.getElementById("reader-content");
  els.chapterHero = document.getElementById("chapter-hero");

  els.fontInc = document.getElementById("font-inc");
  els.fontDec = document.getElementById("font-dec");
  els.progressBarInner = document.getElementById("progress-bar-inner");

  els.tooltip = document.getElementById("term-tooltip");
  els.tooltipTitle = document.getElementById("term-tooltip-title");
  els.tooltipBody = document.getElementById("term-tooltip-body");

  els.loreModal = document.getElementById("lore-modal");
  els.loreModalBackdrop = document.getElementById("lore-modal-backdrop");
  els.loreModalTitle = document.getElementById("lore-modal-title");
  els.loreModalSubtitle = document.getElementById("lore-modal-subtitle");
  els.loreModalBody = document.getElementById("lore-modal-body");
  els.loreModalClose = document.getElementById("lore-modal-close");


}

// ===============================
// UI GLOBAL
// ===============================
function setupGlobalUI() {
  if (els.fontInc) els.fontInc.addEventListener("click", () => adjustFontSize(1));
  if (els.fontDec) els.fontDec.addEventListener("click", () => adjustFontSize(-1));

  if (els.readerContent) {
    els.readerContent.addEventListener("scroll", handleScrollProgress, { passive: true });
  }

  if (els.chapterSelect) {
    els.chapterSelect.addEventListener("change", (e) => {
      const idx = parseInt(e.target.value, 10);
      if (!Number.isNaN(idx)) selectChapter(idx);
    });
  }

  if (els.loreModalClose) els.loreModalClose.addEventListener("click", closeLoreModal);
  if (els.loreModalBackdrop) els.loreModalBackdrop.addEventListener("click", closeLoreModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLoreModal();
  });
  // Mobile: abrir/fechar painel de capítulos
  if (els.chaptersToggle && els.chaptersPanel) {
    els.chaptersToggle.addEventListener("click", () => {
      els.chaptersPanel.classList.toggle("is-open");
    });
  }


  applyFontSize();
  
}





// ===============================
// SUPABASE – CARREGAR CAPÍTULOS
// ===============================
async function loadInitialData() {
  setLoadingState(true);

  try {
    console.log("[Getalis Reader] Buscando capítulos no Supabase…");
    const { data, error } = await supabase
      .from("chapters")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("published_at", { ascending: true, nullsFirst: true });

    if (error) {
      console.error("[Getalis Reader] Erro Supabase:", error);
      showError(
        "Erro ao carregar capítulos",
        "Verifique a URL e a chave anon do Supabase, ou as permissões de SELECT na tabela chapters."
      );
      return;
    }

    CAPITULOS = (data || []).map(mapSupabaseChapterToClient);
    console.log("[Getalis Reader] Capítulos carregados:", CAPITULOS.length);

    if (els.chaptersCounter) {
      els.chaptersCounter.textContent = `${CAPITULOS.length} capítulo(s)`;
    }

    renderChapterSelect();
    renderChaptersList();

    if (CAPITULOS.length > 0) {
      selectChapter(0);
    } else {
      showError(
        "Nenhum capítulo cadastrado",
        "Use o editor para criar o primeiro capítulo da saga."
      );
    }
  } catch (err) {
    console.error("[Getalis Reader] Erro inesperado:", err);
    showError(
      "Erro inesperado",
      "Ocorreu um erro ao inicializar o leitor. Veja o console para detalhes."
    );
  } finally {
    setLoadingState(false);
  }
}

function mapSupabaseChapterToClient(row) {
  const rawContent = row.content || "";
  const paragraphs = rawContent
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return {
    id: row.id,
    titulo: row.title || "Capítulo sem título",
    slug: row.slug,
    status: row.status || "NOVO",
    ordem: row.sort_order ?? 0,
    dataPublicacao: row.published_at ? new Date(row.published_at) : null,
    heroImageUrl: row.hero_image_url || null,
    paragrafos: paragraphs,
  };
}

function setLoadingState(isLoading) {
  if (!els.readerContent) return;
  if (isLoading) {
    els.readerContent.innerHTML =
      '<p class="reader-loading">Carregando capítulos da Névoa…</p>';
  }
}

function showError(titulo, mensagem) {
  if (els.readerTitle) els.readerTitle.textContent = titulo;
  if (els.readerMeta) els.readerMeta.textContent = mensagem;
  if (els.readerContent) {
    els.readerContent.innerHTML = `<p class="reader-loading">${mensagem}</p>`;
  }
}

// ===============================
// RENDERIZAÇÃO DE CAPÍTULOS
// ===============================
function renderChapterSelect() {
  if (!els.chapterSelect) return;
  els.chapterSelect.innerHTML = "";

  CAPITULOS.forEach((cap, index) => {
    const opt = document.createElement("option");
    opt.value = String(index);
    opt.textContent = cap.titulo;
    els.chapterSelect.appendChild(opt);
  });

  els.chapterSelect.value = String(state.currentChapterIndex || 0);
}

function renderChaptersList() {
  if (!els.chaptersList) return;
  els.chaptersList.innerHTML = "";

  

  CAPITULOS.forEach((cap, index) => {
    const li = document.createElement("li");
    li.className = "chapters-item";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chapters-item-btn";
    btn.dataset.index = String(index);

    const titleEl = document.createElement("span");
    titleEl.className = "chapters-item-title";
    titleEl.textContent = cap.titulo;

    const metaEl = document.createElement("span");
    metaEl.className = "chapters-item-meta";
    metaEl.textContent = cap.dataPublicacao
      ? cap.dataPublicacao.toLocaleDateString("pt-BR")
      : cap.status || "RASCUNHO";

    btn.appendChild(titleEl);
    btn.appendChild(metaEl);
    btn.addEventListener("click", () => {
  // troca o capítulo normalmente
  selectChapter(index);

  // se for mobile (largura até 900px), fecha o painel depois da escolha
  if (window.innerWidth <= 900 && els.chaptersPanel) {
    els.chaptersPanel.classList.remove("is-open");
  }
});

    li.appendChild(btn);
    els.chaptersList.appendChild(li);
  });

  highlightSelectedChapter();
}

function selectChapter(index) {
  if (index < 0 || index >= CAPITULOS.length) return;
  state.currentChapterIndex = index;

  const cap = CAPITULOS[index];

  if (els.chapterSelect) els.chapterSelect.value = String(index);
  if (els.readerTitle) els.readerTitle.textContent = cap.titulo;

  if (els.readerMeta) {
    const partes = [];
    if (cap.dataPublicacao) {
      partes.push(`Publicado em ${cap.dataPublicacao.toLocaleDateString("pt-BR")}`);
    }
    if (cap.status) partes.push(`Status: ${cap.status}`);
    els.readerMeta.textContent = partes.join(" · ");
  }

  if (els.chapterHero) {
    if (cap.heroImageUrl) {
      els.chapterHero.style.display = "block";
      els.chapterHero.style.backgroundImage = `url("${cap.heroImageUrl}")`;
    } else {
      els.chapterHero.style.display = "none";
      els.chapterHero.style.backgroundImage = "none";
    }
  }

  renderChapterContent(cap);
  highlightSelectedChapter();
  resetScrollAndProgress();
}

function renderChapterContent(cap) {
  if (!els.readerContent) return;
  els.readerContent.innerHTML = "";

  cap.paragrafos.forEach((texto) => {
    const p = document.createElement("p");
    p.className = "reader-paragraph";
    p.innerHTML = applyGlossaryToText(texto);
    els.readerContent.appendChild(p);
  });

  attachTermEvents();
}

function highlightSelectedChapter() {
  if (!els.chaptersList) return;
  const buttons = els.chaptersList.querySelectorAll(".chapters-item-btn");
  buttons.forEach((btn) => {
    const idx = parseInt(btn.dataset.index || "-1", 10);
    if (idx === state.currentChapterIndex) {
      btn.classList.add("is-active");
    } else {
      btn.classList.remove("is-active");
    }
  });
}

// ===============================
// GLOSSÁRIO / TERMOS
// ===============================
function applyGlossaryToText(text) {
  let result = text;

  Object.keys(GLOSSARIO).forEach((key) => {
    const term = GLOSSARIO[key];
    if (!term) return;

    const pattern = escapeRegExp(term.titulo || key);
    const regex = new RegExp(`\\b(${pattern})\\b`, "gi");

    result = result.replace(
      regex,
      `<span class="term-highlight" data-term-key="${key}">$1</span>`
    );
  });

  return result;
}

function escapeRegExp(str) {
  return (str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function attachTermEvents() {
  if (!els.readerContent) return;
  const terms = els.readerContent.querySelectorAll(".term-highlight");

  terms.forEach((el) => {
    const key = el.getAttribute("data-term-key");
    if (!key || !GLOSSARIO[key]) return;

    el.addEventListener("mouseenter", (e) => showTooltip(e, key));
    el.addEventListener("mouseleave", hideTooltip);
    el.addEventListener("mousemove", moveTooltip);
    el.addEventListener("click", () => openLoreModal(key));
  });
}

// ===============================
// TOOLTIP
// ===============================
function showTooltip(event, key) {
  const term = GLOSSARIO[key];
  if (!term || !els.tooltip) return;

  els.tooltipTitle.textContent = term.titulo || key;
  els.tooltipBody.textContent = term.resumo || "";

  els.tooltip.style.opacity = "1";
  els.tooltip.style.pointerEvents = "auto";
  els.tooltip.setAttribute("aria-hidden", "false");

  positionTooltip(event);
}

function moveTooltip(event) {
  positionTooltip(event);
}

function positionTooltip(event) {
  if (!els.tooltip) return;
  const offset = 12;
  const x = event.clientX + offset;
  const y = event.clientY + offset;
  els.tooltip.style.transform = `translate(${x}px, ${y}px)`;
}

function hideTooltip() {
  if (!els.tooltip) return;
  els.tooltip.style.opacity = "0";
  els.tooltip.style.pointerEvents = "none";
  els.tooltip.setAttribute("aria-hidden", "true");
}

// ===============================
// MODAL DE LORE
// ===============================
function openLoreModal(key) {
  const term = GLOSSARIO[key];
  if (!term || !els.loreModal || !els.loreModalBackdrop) return;

  els.loreModalTitle.textContent = term.titulo || key;
  els.loreModalSubtitle.textContent = "Termo da Névoa – Lore de Getalis";

  els.loreModalBody.innerHTML = "";
  const p = document.createElement("p");
  p.textContent = term.descricao || term.resumo || "";
  els.loreModalBody.appendChild(p);

  els.loreModal.setAttribute("aria-hidden", "false");
  els.loreModalBackdrop.setAttribute("aria-hidden", "false");
  els.loreModal.classList.add("is-open");
  els.loreModalBackdrop.classList.add("is-open");
  document.body.classList.add("has-modal-open");

  hideTooltip();
}

function closeLoreModal() {
  if (!els.loreModal || !els.loreModalBackdrop) return;
  els.loreModal.setAttribute("aria-hidden", "true");
  els.loreModalBackdrop.setAttribute("aria-hidden", "true");
  els.loreModal.classList.remove("is-open");
  els.loreModalBackdrop.classList.remove("is-open");
  document.body.classList.remove("has-modal-open");
}

// ===============================
// FONTE & PROGRESSO
// ===============================
function handleScrollProgress() {
  if (!els.readerContent || !els.progressBarInner) return;

  const scrollTop = els.readerContent.scrollTop;
  const scrollHeight = els.readerContent.scrollHeight;
  const clientHeight = els.readerContent.clientHeight;

  const maxScroll = scrollHeight - clientHeight;
  const progress = maxScroll > 0 ? scrollTop / maxScroll : 0;

  els.progressBarInner.style.transform = `scaleX(${progress})`;
}

function resetScrollAndProgress() {
  if (els.readerContent) els.readerContent.scrollTop = 0;
  if (els.progressBarInner) els.progressBarInner.style.transform = "scaleX(0)";
}

function adjustFontSize(delta) {
  state.baseFontSize = Math.min(24, Math.max(14, state.baseFontSize + delta));
  applyFontSize();
}

function applyFontSize() {
  if (!els.readerContent) return;
  els.readerContent.style.fontSize = `${state.baseFontSize}px`;
}
