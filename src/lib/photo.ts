// 照片工具：壓縮版網址與構圖樣式（壓縮檔由 integrations/optimize-uploads.mjs 在建置時產生）
const WIDTHS = [480, 960, 1600];
const UPLOADS = '/images/uploads/';
const EXT = /\.(jpe?g|png|webp)$/i;

const canOptimize = (src?: string) => !!src && import.meta.env.PROD && src.startsWith(UPLOADS) && EXT.test(src);

const variant = (src: string, w: number) =>
  `/_img/${encodeURIComponent(src.slice(UPLOADS.length).replace(EXT, ''))}-${w}.webp`;

// 給 <img> 用的 src / srcset / sizes；不在照片庫的圖片維持原樣
export function photoAttrs(src: string | undefined, sizes: string) {
  if (!src) return {};
  if (!canOptimize(src)) return { src };
  return {
    src: variant(src, 960),
    srcset: WIDTHS.map((w) => `${variant(src, w)} ${w}w`).join(', '),
    sizes,
  };
}

// 構圖：後台存成「左右,上下,放大」例如 "50,20,1.3"；沒設定時以上緣為準
export function cropStyle(crop?: string) {
  const parts = crop ? crop.split(',').map((s) => parseFloat(s)) : [];
  const [x, y, z] = [50, 0, 1].map((d, i) => (Number.isFinite(parts[i]) ? parts[i] : d));
  const pos = `${x}% ${y}%`;
  return `object-position:${pos};transform:scale(${z});transform-origin:${pos};`;
}
