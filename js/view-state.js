// 저장하지 않는 화면 상태 (선택한 월, 선택한 날짜 등)
import { todayMonth, todayStr } from "./utils.js";

export const view = {
  targetMonth: todayMonth(),
  taskDate: todayStr()
};
