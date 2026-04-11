const path = require('path');
const { createCanvas, registerFont } = require('canvas');
const { STATUS } = require('./embeds');
const { prepareQuestTableData } = require('./questTable');

const FONT_FAMILY = 'QuestTableFont';
const FONT_SIZE = 28;
const HEADER_SIZE = 26;
const MARGIN = 32;
const PAD = 12;

/** Line height = font * multiplier (readable multi-line spacing) */
function bodyLineHeight() {
  return Math.round(FONT_SIZE * 1.38);
}
function headerLineHeight() {
  return Math.round(HEADER_SIZE * 1.38);
}

/**
 * Wide columns + wrapping (no ellipsis) so full quest titles and names fit.
 * Total inner width ~1680px — users can open the image full-screen in Discord.
 */
const COL_W = [110, 620, 240, 130, 200, 180, 180];
const HEADERS = [
  'ID',
  'Quest',
  'Assignee',
  'Status',
  'Category',
  'Created',
  'Completed',
];

/** Max data rows per PNG (wrapping makes rows tall; keep files reasonable) */
const ROWS_PER_IMAGE = 14;

let fontsRegistered = false;

function ensureFonts() {
  if (fontsRegistered) return;
  const pkg = path.dirname(require.resolve('dejavu-fonts-ttf/package.json'));
  registerFont(path.join(pkg, 'ttf', 'DejaVuSans.ttf'), { family: FONT_FAMILY });
  fontsRegistered = true;
}

function statusLabel(status) {
  if (status === STATUS.COMPLETED) return 'Done';
  if (status === STATUS.WORKING) return 'Working';
  return 'Not started';
}

function fmtDate(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Split text into lines that fit maxW (word wrap + break very long words).
 * @returns {string[]}
 */
function wrapText(ctx, text, maxW) {
  const s = String(text ?? '').trim() || '—';
  if (maxW <= 8) return [s];

  const lines = [];
  const words = s.split(/\s+/).filter(Boolean);

  function breakLongWord(word) {
    let rest = word;
    while (rest.length) {
      let n = rest.length;
      while (n > 0 && ctx.measureText(rest.slice(0, n)).width > maxW) n--;
      if (n < 1) n = 1;
      lines.push(rest.slice(0, n));
      rest = rest.slice(n);
    }
  }

  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxW) {
      line = test;
    } else {
      if (line) {
        lines.push(line);
        line = '';
      }
      if (ctx.measureText(word).width <= maxW) {
        line = word;
      } else {
        breakLongWord(word);
      }
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : ['—'];
}

function rowCells(q, nameMap) {
  const id = `Q-${String(q.id).padStart(4, '0')}`;
  const assignee =
    nameMap.get(String(q.assigneeId)) || String(q.assigneeId);
  return [
    id,
    q.title || '—',
    assignee,
    statusLabel(q.status),
    (q.category || '').trim() || '—',
    fmtDate(q.createdAt),
    fmtDate(q.completedAt),
  ];
}

function drawTableImage(questSlice, nameMap) {
  ensureFonts();
  const innerW = COL_W.reduce((a, b) => a + b, 0);
  const W = MARGIN * 2 + innerW;

  const colX = [MARGIN];
  for (let i = 0; i < COL_W.length; i++) {
    colX.push(colX[i] + COL_W[i]);
  }

  const ctx = (() => {
    const canvas = createCanvas(W, 100);
    return canvas.getContext('2d');
  })();

  ctx.font = `${HEADER_SIZE}px ${FONT_FAMILY}`;
  const hLineH = headerLineHeight();
  const headerLineArrays = HEADERS.map((h, c) =>
    wrapText(ctx, h, COL_W[c] - PAD * 2)
  );
  const headerMaxLines = Math.max(1, ...headerLineArrays.map((l) => l.length));
  const headerH = headerMaxLines * hLineH + PAD * 2;

  ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
  const bLineH = bodyLineHeight();

  const rows = questSlice.map((q) => rowCells(q, nameMap));
  const rowHeights = rows.map((cells) => {
    const lineArrays = cells.map((cell, c) =>
      wrapText(ctx, cell, COL_W[c] - PAD * 2)
    );
    const maxLines = Math.max(1, ...lineArrays.map((l) => l.length));
    return maxLines * bLineH + PAD * 2;
  });

  const totalDataH = rowHeights.reduce((a, b) => a + b, 0);
  const H = MARGIN + headerH + totalDataH + MARGIN;

  const canvas = createCanvas(W, H);
  const g = canvas.getContext('2d');
  g.fillStyle = '#1e1f22';
  g.fillRect(0, 0, W, H);

  let y = MARGIN;

  g.fillStyle = '#383a40';
  g.fillRect(MARGIN, y, innerW, headerH);
  g.strokeStyle = '#4e5058';
  g.lineWidth = 1;
  g.strokeRect(MARGIN, y, innerW, headerH);

  g.font = `${HEADER_SIZE}px ${FONT_FAMILY}`;
  g.fillStyle = '#f2f3f5';
  g.textBaseline = 'top';
  for (let c = 0; c < HEADERS.length; c++) {
    const lines = headerLineArrays[c];
    let ly = y + PAD;
    for (const ln of lines) {
      g.fillText(ln, colX[c] + PAD, ly);
      ly += hLineH;
    }
  }

  y += headerH;

  for (let r = 0; r < rows.length; r++) {
    const rowH = rowHeights[r];
    g.fillStyle = r % 2 === 0 ? '#2b2d31' : '#313338';
    g.fillRect(MARGIN, y, innerW, rowH);
    g.strokeStyle = '#3f424a';
    g.strokeRect(MARGIN, y, innerW, rowH);

    g.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
    g.fillStyle = '#dbdee1';
    const cells = rows[r];
    for (let c = 0; c < cells.length; c++) {
      const lines = wrapText(g, cells[c], COL_W[c] - PAD * 2);
      let ly = y + PAD;
      for (const ln of lines) {
        g.fillText(ln, colX[c] + PAD, ly);
        ly += bLineH;
      }
    }
    y += rowH;
  }

  const tableBottom = y;

  g.strokeStyle = '#202225';
  g.lineWidth = 1;
  for (let c = 1; c < colX.length - 1; c++) {
    const x = colX[c];
    g.beginPath();
    g.moveTo(x, MARGIN);
    g.lineTo(x, tableBottom);
    g.stroke();
  }

  return canvas.toBuffer('image/png');
}

/**
 * @returns {Promise<{ buffers: Buffer[], empty: boolean }>}
 */
async function renderQuestTablePngs(guild, allQuests, { filter, sort }) {
  const { quests, nameMap } = await prepareQuestTableData(guild, allQuests, {
    filter,
    sort,
  });

  if (quests.length === 0) {
    return { buffers: [], empty: true };
  }

  const buffers = [];
  for (let i = 0; i < quests.length; i += ROWS_PER_IMAGE) {
    const slice = quests.slice(i, i + ROWS_PER_IMAGE);
    buffers.push(drawTableImage(slice, nameMap));
    if (buffers.length >= 10) break;
  }
  return { buffers, empty: false };
}

async function renderAllQuestsPngs(guild, quests) {
  return renderQuestTablePngs(guild, quests, {
    sort: (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
  });
}

async function renderCompletedQuestsPngs(guild, quests) {
  return renderQuestTablePngs(guild, quests, {
    filter: (q) => q.status === STATUS.COMPLETED,
    sort: (a, b) => (b.completedAt || 0) - (a.completedAt || 0),
  });
}

module.exports = {
  renderAllQuestsPngs,
  renderCompletedQuestsPngs,
};
