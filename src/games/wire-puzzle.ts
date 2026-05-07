// 🔌 ネオン配線パズル — Flow Free 風
// 同じ色の端点を繋ぐ。線は交差させない。すべての色を繋いだらクリア。
// タッチ・マウス両対応 (Pointer Events API)。

export interface Endpoint {
  row: number;
  col: number;
  pairId: number;
  color: string;
}

export interface LevelDef {
  rows: number;
  cols: number;
  endpoints: Endpoint[];
}

interface Cell {
  row: number;
  col: number;
}

interface PointXY {
  x: number;
  y: number;
}

const NEON_COLORS = [
  '#00f0ff', // cyan
  '#ff2dd1', // magenta
  '#ffea3d', // yellow
  '#3dff7a', // green
  '#ff8a2d', // orange
  '#a878ff', // purple
];

export const LEVELS: LevelDef[] = [
  // Level 1: 4x4, 3 ペア (チュートリアル)
  {
    rows: 4,
    cols: 4,
    endpoints: [
      { row: 0, col: 0, pairId: 0, color: NEON_COLORS[0]! },
      { row: 3, col: 3, pairId: 0, color: NEON_COLORS[0]! },
      { row: 0, col: 3, pairId: 1, color: NEON_COLORS[1]! },
      { row: 3, col: 0, pairId: 1, color: NEON_COLORS[1]! },
      { row: 1, col: 1, pairId: 2, color: NEON_COLORS[2]! },
      { row: 2, col: 2, pairId: 2, color: NEON_COLORS[2]! },
    ],
  },
  // Level 2: 5x5, 4 ペア
  {
    rows: 5,
    cols: 5,
    endpoints: [
      { row: 0, col: 0, pairId: 0, color: NEON_COLORS[0]! },
      { row: 4, col: 4, pairId: 0, color: NEON_COLORS[0]! },
      { row: 0, col: 4, pairId: 1, color: NEON_COLORS[1]! },
      { row: 4, col: 0, pairId: 1, color: NEON_COLORS[1]! },
      { row: 1, col: 2, pairId: 2, color: NEON_COLORS[2]! },
      { row: 3, col: 2, pairId: 2, color: NEON_COLORS[2]! },
      { row: 2, col: 0, pairId: 3, color: NEON_COLORS[3]! },
      { row: 2, col: 4, pairId: 3, color: NEON_COLORS[3]! },
    ],
  },
  // Level 3: 6x6, 5 ペア
  {
    rows: 6,
    cols: 6,
    endpoints: [
      { row: 0, col: 0, pairId: 0, color: NEON_COLORS[0]! },
      { row: 5, col: 5, pairId: 0, color: NEON_COLORS[0]! },
      { row: 0, col: 5, pairId: 1, color: NEON_COLORS[1]! },
      { row: 5, col: 0, pairId: 1, color: NEON_COLORS[1]! },
      { row: 1, col: 2, pairId: 2, color: NEON_COLORS[2]! },
      { row: 4, col: 3, pairId: 2, color: NEON_COLORS[2]! },
      { row: 2, col: 0, pairId: 3, color: NEON_COLORS[3]! },
      { row: 3, col: 5, pairId: 3, color: NEON_COLORS[3]! },
      { row: 2, col: 4, pairId: 4, color: NEON_COLORS[4]! },
      { row: 4, col: 1, pairId: 4, color: NEON_COLORS[4]! },
    ],
  },
];

export class WirePuzzle {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private level: LevelDef;
  private cellSize = 0;
  private offsetX = 0;
  private offsetY = 0;
  /** pairId → cells (端点含む全経路) */
  private paths = new Map<number, Cell[]>();
  /** 現在ドラッグ中の経路 */
  private drawing: { pairId: number; color: string; cells: Cell[] } | null = null;
  /** クリア状態 */
  private cleared = false;
  /** 状態変化通知 (UI 表示更新用) */
  private onStateChange: () => void;
  /** クリア演出のタイマー */
  private celebrationStartedAt: number | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    level: LevelDef,
    onStateChange: () => void = () => {},
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    this.ctx = ctx;
    this.level = level;
    this.onStateChange = onStateChange;
    this.setupCanvas();
    this.bindEvents();
    this.render();
    window.addEventListener('resize', this.handleResize);
  }

  destroy(): void {
    window.removeEventListener('resize', this.handleResize);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerUp);
  }

  loadLevel(level: LevelDef): void {
    this.level = level;
    this.paths.clear();
    this.drawing = null;
    this.cleared = false;
    this.celebrationStartedAt = null;
    this.setupCanvas();
    this.render();
    this.onStateChange();
  }

  reset(): void {
    this.paths.clear();
    this.drawing = null;
    this.cleared = false;
    this.celebrationStartedAt = null;
    this.render();
    this.onStateChange();
  }

  isCleared(): boolean {
    return this.cleared;
  }

  countConnectedPairs(): number {
    const totalPairs = new Set(this.level.endpoints.map((e) => e.pairId)).size;
    let connected = 0;
    for (let i = 0; i < totalPairs; i++) {
      if (this.isPairConnected(i)) connected++;
    }
    return connected;
  }

  totalPairs(): number {
    return new Set(this.level.endpoints.map((e) => e.pairId)).size;
  }

  // ---------------------------------------------------------------------------
  // Setup / Resize
  // ---------------------------------------------------------------------------

  private handleResize = (): void => {
    this.setupCanvas();
    this.render();
  };

  private setupCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    const padding = 16;
    const availW = rect.width - padding * 2;
    const availH = rect.height - padding * 2;
    this.cellSize = Math.min(availW / this.level.cols, availH / this.level.rows);
    this.offsetX = (rect.width - this.cellSize * this.level.cols) / 2;
    this.offsetY = (rect.height - this.cellSize * this.level.rows) / 2;
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  private bindEvents(): void {
    this.canvas.style.touchAction = 'none';
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
    this.canvas.addEventListener('pointerleave', this.onPointerUp);
  }

  private toCell(px: PointXY): Cell | null {
    const col = Math.floor((px.x - this.offsetX) / this.cellSize);
    const row = Math.floor((px.y - this.offsetY) / this.cellSize);
    if (row < 0 || row >= this.level.rows) return null;
    if (col < 0 || col >= this.level.cols) return null;
    return { row, col };
  }

  private getEventXY(e: PointerEvent): PointXY {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private endpointAt(cell: Cell): Endpoint | null {
    return (
      this.level.endpoints.find((e) => e.row === cell.row && e.col === cell.col) ?? null
    );
  }

  /** その cell が既に他色の経路で占有されていれば true。drawing 中の自色は OK。 */
  private isOccupiedByOther(cell: Cell, ignorePairId: number): boolean {
    for (const [pairId, cells] of this.paths.entries()) {
      if (pairId === ignorePairId) continue;
      if (cells.some((c) => c.row === cell.row && c.col === cell.col)) return true;
    }
    // 他色の端点もブロック
    const ep = this.endpointAt(cell);
    if (ep && ep.pairId !== ignorePairId) return true;
    return false;
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (this.cleared) return;
    const xy = this.getEventXY(e);
    const cell = this.toCell(xy);
    if (!cell) return;

    const ep = this.endpointAt(cell);
    if (ep) {
      // この pair の既存経路をクリア
      this.paths.delete(ep.pairId);
      this.drawing = {
        pairId: ep.pairId,
        color: ep.color,
        cells: [{ row: cell.row, col: cell.col }],
      };
      this.canvas.setPointerCapture(e.pointerId);
      this.render();
      return;
    }

    // 既存経路の cell をタップしたら、その色の path を引き継いで再描画開始 (途中から)
    for (const [pairId, cells] of this.paths.entries()) {
      const idx = cells.findIndex((c) => c.row === cell.row && c.col === cell.col);
      if (idx >= 0) {
        const ep0 = this.level.endpoints.find((e2) => e2.pairId === pairId);
        if (!ep0) continue;
        // タップ位置までを残し、それ以降は破棄して延長を再開
        this.drawing = {
          pairId,
          color: ep0.color,
          cells: cells.slice(0, idx + 1),
        };
        this.paths.delete(pairId);
        this.canvas.setPointerCapture(e.pointerId);
        this.render();
        return;
      }
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.drawing) return;
    const xy = this.getEventXY(e);
    const cell = this.toCell(xy);
    if (!cell) return;

    const last = this.drawing.cells[this.drawing.cells.length - 1];
    if (!last) return;
    if (cell.row === last.row && cell.col === last.col) return;

    // 隣接判定 (4 近傍のみ)
    const dr = Math.abs(cell.row - last.row);
    const dc = Math.abs(cell.col - last.col);
    if (!(dr + dc === 1)) {
      // 飛び越えなら無視 (将来: 経路補完してもよい)
      return;
    }

    // バックトラック (1 つ前のセルへ戻す)
    if (this.drawing.cells.length >= 2) {
      const prev = this.drawing.cells[this.drawing.cells.length - 2]!;
      if (prev.row === cell.row && prev.col === cell.col) {
        this.drawing.cells.pop();
        this.render();
        return;
      }
    }

    // 同色経路で訪問済み = 進めない
    const alreadyInOwnPath = this.drawing.cells.some(
      (c) => c.row === cell.row && c.col === cell.col,
    );
    if (alreadyInOwnPath) return;

    // 他色とブロック
    if (this.isOccupiedByOther(cell, this.drawing.pairId)) return;

    // ペアの相手端点に到達したか
    const ep = this.endpointAt(cell);
    if (ep) {
      if (ep.pairId !== this.drawing.pairId) return; // 他色の端点ブロック
      // 自色の相手端点 (= 開始点ではない方) → 確定
      this.drawing.cells.push({ row: cell.row, col: cell.col });
      this.paths.set(this.drawing.pairId, this.drawing.cells);
      this.drawing = null;
      this.checkCleared();
      this.render();
      this.onStateChange();
      return;
    }

    // 通常進行
    this.drawing.cells.push({ row: cell.row, col: cell.col });
    this.render();
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.canvas.hasPointerCapture(e.pointerId)) {
      this.canvas.releasePointerCapture(e.pointerId);
    }
    if (!this.drawing) return;
    // 完成していなければ確定経路として保存しない (= キャンセル)
    // 半端な経路は破棄。
    this.drawing = null;
    this.render();
    this.onStateChange();
  };

  private isPairConnected(pairId: number): boolean {
    const cells = this.paths.get(pairId);
    if (!cells || cells.length < 2) return false;
    const first = cells[0]!;
    const last = cells[cells.length - 1]!;
    const ep1 = this.endpointAt(first);
    const ep2 = this.endpointAt(last);
    return Boolean(
      ep1 && ep2 && ep1.pairId === pairId && ep2.pairId === pairId,
    );
  }

  private checkCleared(): void {
    if (this.countConnectedPairs() === this.totalPairs()) {
      this.cleared = true;
      this.celebrationStartedAt = performance.now();
      this.animateCelebration();
    }
  }

  private animateCelebration(): void {
    if (!this.celebrationStartedAt) return;
    const elapsed = performance.now() - this.celebrationStartedAt;
    if (elapsed < 1500) {
      this.render();
      requestAnimationFrame(() => this.animateCelebration());
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  private render(): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    // グリッド
    this.drawGrid(ctx);

    // 確定経路
    for (const [pairId, cells] of this.paths.entries()) {
      const ep = this.level.endpoints.find((e) => e.pairId === pairId);
      if (!ep) continue;
      this.drawPath(ctx, cells, ep.color, false);
    }

    // 描画中
    if (this.drawing) {
      this.drawPath(ctx, this.drawing.cells, this.drawing.color, true);
    }

    // 端点
    for (const ep of this.level.endpoints) {
      this.drawEndpoint(ctx, ep);
    }

    // クリア演出
    if (this.cleared) {
      this.drawCelebration(ctx, rect);
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let r = 0; r <= this.level.rows; r++) {
      const y = this.offsetY + r * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(this.offsetX, y);
      ctx.lineTo(this.offsetX + this.cellSize * this.level.cols, y);
      ctx.stroke();
    }
    for (let c = 0; c <= this.level.cols; c++) {
      const x = this.offsetX + c * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(x, this.offsetY);
      ctx.lineTo(x, this.offsetY + this.cellSize * this.level.rows);
      ctx.stroke();
    }
  }

  private cellCenter(cell: Cell): PointXY {
    return {
      x: this.offsetX + (cell.col + 0.5) * this.cellSize,
      y: this.offsetY + (cell.row + 0.5) * this.cellSize,
    };
  }

  private drawPath(
    ctx: CanvasRenderingContext2D,
    cells: Cell[],
    color: string,
    drawing: boolean,
  ): void {
    if (cells.length < 1) return;
    const widths = [this.cellSize * 0.42, this.cellSize * 0.28];
    const alphas = [0.35, 1];

    for (let layer = 0; layer < 2; layer++) {
      ctx.strokeStyle = color;
      ctx.lineWidth = widths[layer]!;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = alphas[layer]! * (drawing ? 0.85 : 1);
      ctx.shadowColor = color;
      ctx.shadowBlur = layer === 0 ? 16 : 0;
      ctx.beginPath();
      const first = this.cellCenter(cells[0]!);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < cells.length; i++) {
        const p = this.cellCenter(cells[i]!);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private drawEndpoint(ctx: CanvasRenderingContext2D, ep: Endpoint): void {
    const { x, y } = this.cellCenter({ row: ep.row, col: ep.col });
    const r = this.cellSize * 0.28;
    // glow
    ctx.fillStyle = ep.color;
    ctx.shadowColor = ep.color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // inner dark dot for contrast
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawCelebration(ctx: CanvasRenderingContext2D, rect: DOMRect): void {
    const t = performance.now() - (this.celebrationStartedAt ?? 0);
    const progress = Math.min(t / 1500, 1);
    // 全体を発光させるオーバーレイ
    ctx.fillStyle = `rgba(0,240,255,${0.15 * (1 - progress)})`;
    ctx.fillRect(0, 0, rect.width, rect.height);
    // CLEAR! テキスト
    ctx.fillStyle = `rgba(255,234,61,${1 - progress})`;
    ctx.shadowColor = '#ffea3d';
    ctx.shadowBlur = 30;
    ctx.font = `bold ${Math.min(rect.width, rect.height) * 0.18}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cy = rect.height / 2 - progress * 20;
    ctx.fillText('CLEAR!', rect.width / 2, cy);
    ctx.shadowBlur = 0;
  }
}
