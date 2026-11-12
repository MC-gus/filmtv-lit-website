// 建置完成後，把後台上傳的照片（public/images/uploads）轉成網頁用的 WebP 多尺寸版本
// 輸出到 dist/_img/<檔名>-<寬度>.webp；原始檔保留不動，構圖可隨時重調
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export const WIDTHS = [480, 960, 1600];
const EXT = /\.(jpe?g|png|webp)$/i;

export default function optimizeUploads() {
  return {
    name: 'optimize-uploads',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const src = path.join(root, 'images', 'uploads');
        const out = path.join(root, '_img');
        await fs.mkdir(out, { recursive: true });
        const files = (await fs.readdir(src).catch(() => [])).filter((f) => EXT.test(f));
        let before = 0, after = 0;
        for (const file of files) {
          const input = path.join(src, file);
          const base = file.replace(EXT, '');
          before += (await fs.stat(input)).size;
          for (const w of WIDTHS) {
            const target = path.join(out, `${base}-${w}.webp`);
            try {
              await sharp(input).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 82 }).toFile(target);
            } catch (e) {
              // 轉檔失敗時放原檔，頁面不會出現破圖
              logger.warn(`無法壓縮 ${file}：${e.message}，改用原檔`);
              await fs.copyFile(input, target);
            }
            if (w === 960) after += (await fs.stat(target)).size;
          }
        }
        logger.info(`照片壓縮完成：${files.length} 張，原始 ${(before / 1048576).toFixed(1)}MB → 960 寬版本合計 ${(after / 1048576).toFixed(1)}MB`);
      },
    },
  };
}
