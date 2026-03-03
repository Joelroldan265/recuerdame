import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  voice: router({
    /**
     * Recibe el audio como base64, lo sube a S3 y lo transcribe con Whisper.
     * Usa publicProcedure porque la app no requiere autenticación.
     */
    transcribe: publicProcedure
      .input(
        z.object({
          audioBase64: z.string().min(1),
          mimeType: z.string().default("audio/m4a"),
        })
      )
      .mutation(async ({ input }) => {
        // 1. Decodificar base64 → Buffer
        const buffer = Buffer.from(input.audioBase64, "base64");

        // 2. Subir a S3 para obtener URL pública
        const ext = input.mimeType.split("/")[1] ?? "m4a";
        const key = `voice-recordings/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);

        // 3. Transcribir con Whisper
        const result = await transcribeAudio({
          audioUrl: url,
          language: "es",
          prompt: "Transcribe este recordatorio en español",
        });

        if ("error" in result) {
          throw new Error(result.error);
        }

        return { text: result.text ?? "" };
      }),
  }),
});

export type AppRouter = typeof appRouter;
