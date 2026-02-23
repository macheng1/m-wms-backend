import * as multer from 'multer';
import * as iconv from 'iconv-lite';

/**
 * Multer 配置，统一处理中文文件名编码问题
 */

/**
 * 处理中文文件名编码
 * Multer 默认使用 Latin-1 编码，需要转换为 UTF-8
 */
function handleChineseFilename(filename: string): string {
  try {
    // 尝试将 Latin-1 编码的文件名转换为 UTF-8
    const buffer = Buffer.from(filename, 'latin1');
    return iconv.decode(buffer, 'utf-8');
  } catch (e) {
    // 如果转换失败，使用原始文件名
    console.warn('文件名编码转换失败，使用原始文件名:', e);
    return filename;
  }
}

/**
 * 磁盘存储配置
 */
export const diskStorageConfig = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'src/uploadsImg/');
  },
  filename: (req, file, cb) => {
    const filename = handleChineseFilename(file.originalname);
    cb(null, filename);
  },
});

/**
 * 内存存储配置（用于不需要保存到本地的场景）
 */
export const memoryStorageConfig = multer.memoryStorage();

/**
 * 文件名处理工具函数
 */
export const multerUtils = {
  handleChineseFilename,
};
