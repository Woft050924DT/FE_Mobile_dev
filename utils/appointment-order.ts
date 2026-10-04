export interface SchedulableAppointment {
  status: string;
  scheduled_at?: string | null;
}

const STATUS_PRIORITY: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  checked_in: 2,
  in_progress: 3,
  completed: 4,
  no_show: 5,
  cancelled: 6,
};

export const sortAppointmentsByStatusAndDate = <T extends SchedulableAppointment>(
  appointments: readonly T[]
): T[] =>
  appointments
    .map((appointment, index) => ({
      appointment,
      index,
      statusPriority: STATUS_PRIORITY[appointment.status] ?? 7,
      scheduledTime: appointment.scheduled_at
        ? Date.parse(appointment.scheduled_at)
        : Number.NaN,
    }))
    .sort((left, right) => {
      if (left.statusPriority !== right.statusPriority) {
        return left.statusPriority - right.statusPriority;
      }

      const leftHasTime = Number.isFinite(left.scheduledTime);
      const rightHasTime = Number.isFinite(right.scheduledTime);
      if (leftHasTime !== rightHasTime) return leftHasTime ? -1 : 1;
      if (leftHasTime && rightHasTime && left.scheduledTime !== right.scheduledTime) {
        return left.scheduledTime - right.scheduledTime;
      }

      return left.index - right.index;
    })
    .map(({ appointment }) => appointment);
