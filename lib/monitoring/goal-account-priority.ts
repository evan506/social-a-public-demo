export type GoalAccountPriority = {
  needsConnection: boolean;
  achievementRate: number | null;
  name: string;
};

export function compareGoalAccountPriority(left: GoalAccountPriority, right: GoalAccountPriority) {
  if (left.needsConnection !== right.needsConnection) return left.needsConnection ? 1 : -1;
  const rateDifference = (left.achievementRate ?? -1) - (right.achievementRate ?? -1);
  if (rateDifference !== 0) return rateDifference;
  return left.name.localeCompare(right.name, "ko-KR");
}
