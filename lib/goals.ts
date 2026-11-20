/**
 * lib/goals.ts — Dự báo mục tiêu tiết kiệm (thuần, dễ test)
 */
import { SavingsGoal } from "@/types";
import {
  addDays,
  differenceInCalendarDays,
  min as minDate,
  parseISO,
  startOfDay,
  subDays,
} from "date-fns";

export interface GoalProjection {
  percent: number;
  remaining: number;
  dailyRate: number;
  monthlyRate: number;
  daysToGoal: number | null; // null = chưa đủ dữ liệu
  etaDate: Date | null;
  isComplete: boolean;
  deadlineDays: number | null;
  requiredMonthly: number | null; // cần để dành bao nhiêu/tháng để kịp hạn
  onTrack: boolean | null;
}

/**
 * Tốc độ tiết kiệm = tổng tiền nạp trong `windowDays` ngày gần nhất / số ngày thực tế.
 * Số ngày tối thiểu là 7 để tránh thổi phồng tốc độ khi vừa nạp lần đầu.
 */
export function projectGoal(
  goal: SavingsGoal,
  now: Date = new Date(),
  windowDays = 60
): GoalProjection {
  const target = Math.max(0, goal.target);
  const saved = Math.max(0, goal.saved);
  const remaining = Math.max(0, target - saved);
  const isComplete = target > 0 && saved >= target;
  const percent = target > 0 ? Math.min(100, (saved / target) * 100) : 0;

  const contribs = goal.contributions.filter((c) => c.amount > 0);
  const windowStart = subDays(startOfDay(now), windowDays);
  const recentSum = contribs
    .filter((c) => {
      const d = parseISO(c.date);
      return d >= windowStart && d <= now;
    })
    .reduce((s, c) => s + c.amount, 0);

  const firstDate = contribs.length
    ? minDate(contribs.map((c) => parseISO(c.date)))
    : parseISO(goal.createdAt);
  const daysSinceStart = Math.max(0, differenceInCalendarDays(now, firstDate));
  const span = Math.max(7, Math.min(windowDays, daysSinceStart));
  const dailyRate = recentSum > 0 ? recentSum / span : 0;

  let daysToGoal: number | null = null;
  let etaDate: Date | null = null;
  if (isComplete) {
    daysToGoal = 0;
    etaDate = startOfDay(now);
  } else if (dailyRate > 0) {
    daysToGoal = Math.ceil(remaining / dailyRate);
    etaDate = addDays(startOfDay(now), daysToGoal);
  }

  let deadlineDays: number | null = null;
  let requiredMonthly: number | null = null;
  let onTrack: boolean | null = null;
  if (goal.deadline) {
    const deadline = parseISO(goal.deadline);
    deadlineDays = differenceInCalendarDays(deadline, now);
    if (isComplete) {
      onTrack = true;
    } else {
      requiredMonthly =
        deadlineDays > 0 ? Math.ceil(remaining / (deadlineDays / 30)) : remaining;
      onTrack = etaDate ? etaDate <= deadline : false;
    }
  }

  return {
    percent,
    remaining,
    dailyRate,
    monthlyRate: dailyRate * 30,
    daysToGoal,
    etaDate,
    isComplete,
    deadlineDays,
    requiredMonthly,
    onTrack,
  };
}
