import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timersApi, type ActiveTimer } from '@/lib/api';

export function useTimers(meetingId: string) {
  const queryClient = useQueryClient();

  const { data: activeTimer, refetch } = useQuery({
    queryKey: ['timers', meetingId],
    queryFn: () => timersApi.getActive(meetingId),
    enabled: !!meetingId,
  });

  const startTopic = useMutation({
    mutationFn: ({ topicId, durationSec }: { topicId: string; durationSec: number }) =>
      timersApi.startTopic(meetingId, topicId, durationSec),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timers', meetingId] });
    },
  });

  const stop = useMutation({
    mutationFn: (timerId: string) => timersApi.stop(meetingId, timerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timers', meetingId] });
    },
  });

  return { activeTimer: activeTimer ?? null, refetch, startTopic, stop };
}
