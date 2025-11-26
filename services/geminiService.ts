
import { Word } from "../types";
import { WORD_DATABASE } from "./mockData";

export const fetchAiWords = async (): Promise<Word[]> => {
  // 移除 API 連線功能，直接回傳擴充後的本地題庫
  // 這確保了離線可用性與系統穩定性
  return WORD_DATABASE;
};
