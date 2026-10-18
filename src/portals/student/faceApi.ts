import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { FaceStatus } from '@/types'

const FACE_KEY = ['students', 'me', 'face'] as const

/** Whether the student has turned face check-in on, and whether a lecturer has registered their face yet. */
export const useMyFaceStatus = () =>
  useQuery({
    queryKey: FACE_KEY,
    queryFn: async () => (await api.get<FaceStatus>('/students/me/face')).data,
  })

/** Turning it off also deletes the student's registered face on the server. */
export const useSetFaceConsent = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (on: boolean) =>
      (on ? await api.put<FaceStatus>('/students/me/face-consent') : await api.delete<FaceStatus>('/students/me/face-consent')).data,
    onSuccess: (status) => qc.setQueryData(FACE_KEY, status),
  })
}
