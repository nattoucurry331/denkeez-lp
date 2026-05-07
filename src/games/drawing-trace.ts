// 📐 製図トレース — お手本の電気図面ラインを指でなぞって再現する画力診断ゲーム。
// 一筆書きを前提とし、ユーザーの軌跡とお手本パスの近接性をスコア化する。
//
// 結果画面で「免許取り直し / 見習い / 中堅 / ベテラン / 製図の神」を判定。
// SNS でシェアしたくなる自虐ネタ枠。

interface PointXY {
  x: number;
  y: number;
}

interface SamplePoint extends PointXY {
  /** お手本パスの先頭からの累積長 (ガイドとなる方向情報) */
  cumLen?: number;
}

interface Diagnosis {
  rank: string;
  emoji: string;
  comment: string;
}

export interface TargetPath {
  id: string;
  name: string;
  /** 0..1 正規化座標 (Canvas サイズ非依存)。一筆書き想定。 */
  points: PointXY[];
}

/** 0..1 座標で定義した一筆書きパスを Canvas px に展開するヘルパ */
export function expandPath(
  target: TargetPath,
  width: number,
  height: number,
  padding: number,
): PointXY[] {
  const w = width - padding * 2;
  const h = height - padding * 2;
  return target.points.map((p) => ({
    x: padding + p.x * w,
    y: padding + p.y * h,
  }));
}

export const TARGETS: TargetPath[] = [
  {
    id: 'house',
    name: 'おうちの形',
    // 屋根のある家のシルエット (五角形)
    points: [
      { x: 0.15, y: 0.85 },
      { x: 0.15, y: 0.45 },
      { x: 0.5, y: 0.15 },
      { x: 0.85, y: 0.45 },
      { x: 0.85, y: 0.85 },
      { x: 0.15, y: 0.85 },
    ],
  },
  {
    id: 'down-light',
    name: 'ダウンライトの円',
    // 円の近似 (16 点)
    points: Array.from({ length: 17 }, (_, i) => {
      const t = (i / 16) * Math.PI * 2;
      return { x: 0.5 + Math.cos(t) * 0.32, y: 0.5 + Math.sin(t) * 0.32 };
    }),
  },
  {
    id: 'wiring',
    name: 'L 字配線',
    points: [
      { x: 0.15, y: 0.25 },
      { x: 0.55, y: 0.25 },
      { x: 0.55, y: 0.65 },
      { x: 0.85, y: 0.65 },
    ],
  },
  {
    id: 'switch',
    name: 'スイッチ記号 (●)',
    // 単極スイッチの黒丸 (小さめ)
    points: Array.from({ length: 17 }, (_, i) => {
      const t = (i / 16) * Math.PI * 2;
      return { x: 0.5 + Math.cos(t) * 0.22, y: 0.5 + Math.sin(t) * 0.22 };
    }),
  },
  {
    id: 'zigzag',
    name: 'ジグザグ',
    points: [
      { x: 0.1, y: 0.5 },
      { x: 0.3, y: 0.25 },
      { x: 0.5, y: 0.5 },
      { x: 0.7, y: 0.25 },
      { x: 0.9, y: 0.5 },
    ],
  },
];

/**
 * パスの全長を pixel 距離で計算
 */
function pathLength(points: PointXY[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}

/** ターゲットパスを等間隔でサンプリング (n 点) */
function resample(points: PointXY[], n: number): SamplePoint[] {
  if (points.length < 2 || n < 2) return points.map((p) => ({ ...p }));
  const total = pathLength(points);
  const step = total / (n - 1);
  const out: SamplePoint[] = [{ ...points[0]!, cumLen: 0 }];
  let acc = 0;
  let idx = 1;
  let cur = { ...points[0]! };
  while (out.length < n && idx < points.length) {
    const next = points[idx]!;
    const segLen = Math.hypot(next.x - cur.x, next.y - cur.y);
    if (acc + segLen >= step * out.length - 0.0001) {
      // この区間内に next sample 点が乗る
      while (out.length < n && acc + segLen >= step * out.length - 0.0001) {
        const t = (step * out.length - acc) / segLen;
        const px = cur.x + t * (next.x - cur.x);
        const py = cur.y + t * (next.y - cur.y);
        out.push({ x: px, y: py, cumLen: step * out.length });
      }
    }
    acc += segLen;
    cur = { ...next };
    idx++;
  }
  while (out.length < n) {
    out.push({ ...points[points.length - 1]!, cumLen: total });
  }
  return out;
}

/**
 * 各サンプル点に対する最近傍距離を平均し、目標パスの典型寸法 (≒ 全長 / N) で正規化。
 * 0% (完全一致) 〜 100% (大幅にずれた) を 100..0 のスコアに反転。
 */
export function computeAccuracyScore(
  target: PointXY[],
  user: PointXY[],
  canvasSize: { width: number; height: number },
): number {
  if (user.length < 2) return 0;
  const SAMPLES = 64;
  const targetSamples = resample(target, SAMPLES);
  const userSamples = resample(user, SAMPLES);

  // 平均最近傍距離 (target → user の各方向)
  const dists: number[] = [];
  for (const t of targetSamples) {
    let minD = Infinity;
    for (const u of userSamples) {
      const d = Math.hypot(u.x - t.x, u.y - t.y);
      if (d < minD) minD = d;
    }
    dists.push(minD);
  }
  // 同じく user → target で対称化
  for (const u of userSamples) {
    let minD = Infinity;
    for (const t of targetSamples) {
      const d = Math.hypot(u.x - t.x, u.y - t.y);
      if (d < minD) minD = d;
    }
    dists.push(minD);
  }

  const avgD = dists.reduce((a, b) => a + b, 0) / dists.length;
  // 許容誤差: canvas 短辺の 18% を「0 点」基準とする
  const tolerance = Math.min(canvasSize.width, canvasSize.height) * 0.18;
  const raw = Math.max(0, 1 - avgD / tolerance);
  return Math.round(raw * 100);
}

/** スコア → 称号 */
export function diagnoseScore(score: number): Diagnosis {
  if (score >= 95) {
    return { rank: '製図の神', emoji: '⚡', comment: 'まさかの完全一致。職人魂を見た!' };
  }
  if (score >= 80) {
    return { rank: 'ベテラン電気工事士', emoji: '🛠️', comment: '見事な腕前。元請けも信頼します。' };
  }
  if (score >= 60) {
    return { rank: '中堅レベル', emoji: '👷', comment: 'なかなかやる。あと少しで一人前。' };
  }
  if (score >= 40) {
    return { rank: '見習い', emoji: '📐', comment: 'ぐにゃぐにゃ。練習あるのみ!' };
  }
  if (score >= 20) {
    return { rank: '免許取り直し候補', emoji: '😵', comment: '元請けがざわつくレベル。' };
  }
  return { rank: '想定外の物体', emoji: '🌀', comment: 'これはアートですか? 抽象画ですか?' };
}

/**
 * Drawing Trace ゲームのコントローラ。
 * Canvas に target を描き、ユーザーの finger / mouse 軌跡を記録、リリース時にスコア算出。
 */
export class DrawingTrace {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private target: TargetPath;
  private targetPx: PointXY[] = [];
  private userPath: PointXY[] = [];
  private drawing = false;
  private finished = false;
  private result: { score: number; diagnosis: Diagnosis } | null = null;
  private padding = 32;
  private onResultChange: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    target: TargetPath,
    onResultChange: () => void = () => {},
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    this.ctx = ctx;
    this.target = target;
    this.onResultChange = onResultChange;
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
  }

  loadTarget(target: TargetPath): void {
    this.target = target;
    this.userPath = [];
    this.drawing = false;
    this.finished = false;
    this.result = null;
    this.setupCanvas();
    this.render();
    this.onResultChange();
  }

  reset(): void {
    this.userPath = [];
    this.drawing = false;
    this.finished = false;
    this.result = null;
    this.render();
    this.onResultChange();
  }

  getResult(): { score: number; diagnosis: Diagnosis } | null {
    return this.result;
  }

  isFinished(): boolean {
    return this.finished;
  }

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
    this.targetPx = expandPath(this.target, rect.width, rect.height, this.padding);
  }

  private bindEvents(): void {
    this.canvas.style.touchAction = 'none';
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
  }

  private getEventXY(e: PointerEvent): PointXY {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (this.finished) return;
    this.drawing = true;
    this.userPath = [this.getEventXY(e)];
    this.canvas.setPointerCapture(e.pointerId);
    this.render();
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.drawing) return;
    const p = this.getEventXY(e);
    const last = this.userPath[this.userPath.length - 1];
    // 細かすぎる移動は無視
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < 1.5) return;
    this.userPath.push(p);
    this.render();
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.canvas.hasPointerCapture(e.pointerId)) {
      this.canvas.releasePointerCapture(e.pointerId);
    }
    if (!this.drawing) return;
    this.drawing = false;
    if (this.userPath.length < 5) {
      // ほぼタップだけ → スコア算出しない (リトライ扱い)
      this.userPath = [];
      this.render();
      return;
    }
    this.finalize();
  };

  private finalize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const score = computeAccuracyScore(this.targetPx, this.userPath, {
      width: rect.width,
      height: rect.height,
    });
    const diagnosis = diagnoseScore(score);
    this.result = { score, diagnosis };
    this.finished = true;
    this.render();
    this.onResultChange();
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  private render(): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    // 背景の方眼 (薄め)
    this.drawGridBackground(ctx, rect);

    // ターゲットパス (ガイド)
    this.drawTarget(ctx);

    // ユーザーの軌跡 (描画中はネオン色、確定時は色付け)
    if (this.userPath.length >= 2) {
      this.drawUserPath(ctx);
    }

    // 結果オーバーレイ
    if (this.finished && this.result) {
      this.drawResultOverlay(ctx, rect);
    }
  }

  private drawGridBackground(ctx: CanvasRenderingContext2D, rect: DOMRect): void {
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    const grid = 24;
    for (let x = 0; x < rect.width; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }
    for (let y = 0; y < rect.height; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }
  }

  private drawTarget(ctx: CanvasRenderingContext2D): void {
    const pts = this.targetPx;
    if (pts.length < 2) return;
    // ガイド (点線、薄)
    ctx.strokeStyle = this.finished
      ? 'rgba(255,234,61,0.55)'
      : 'rgba(0,240,255,0.6)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([10, 8]);
    ctx.shadowColor = this.finished ? '#ffea3d' : '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(pts[0]!.x, pts[0]!.y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i]!.x, pts[i]!.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // 始点 (緑) と終点 (赤)
    const first = pts[0]!;
    const last = pts[pts.length - 1]!;
    ctx.fillStyle = '#3dff7a';
    ctx.shadowColor = '#3dff7a';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(first.x, first.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff2dd1';
    ctx.shadowColor = '#ff2dd1';
    ctx.beginPath();
    ctx.arc(last.x, last.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawUserPath(ctx: CanvasRenderingContext2D): void {
    const pts = this.userPath;
    const color = this.finished
      ? this.result!.score >= 60 ? '#3dff7a' : '#ff2dd1'
      : '#ffea3d';
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(pts[0]!.x, pts[0]!.y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i]!.x, pts[i]!.y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private drawResultOverlay(ctx: CanvasRenderingContext2D, rect: DOMRect): void {
    if (!this.result) return;
    // 上部にスコアパッチ
    ctx.fillStyle = 'rgba(10,14,26,0.85)';
    ctx.fillRect(0, 0, rect.width, 64);
    ctx.fillStyle = '#ffea3d';
    ctx.shadowColor = '#ffea3d';
    ctx.shadowBlur = 20;
    ctx.font = 'bold 28px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(`${this.result.score} 点`, 20, 32);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(
      `${this.result.diagnosis.emoji} ${this.result.diagnosis.rank}`,
      rect.width - 20,
      32,
    );
  }
}
