import { describe, expect, it, vi } from "vitest";
import { buildPayload, decodeAudioContent, synthesizeNarration } from "./generate-inworld-tts.mjs";

describe("Inworld narration helper", () => {
  it("builds the documented LINEAR16 request without exposing credentials", () => {
    expect(buildPayload("  Hello release room. ")).toEqual({
      text: "Hello release room.",
      voiceId: "Dennis",
      modelId: "inworld-tts-2",
      audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: 22_050 },
      deliveryMode: "BALANCED",
      applyTextNormalization: "ON",
    });
  });

  it("decodes the base64 audio response", () => {
    expect(decodeAudioContent({ audioContent: Buffer.from("RIFF").toString("base64") })).toEqual(
      Buffer.from("RIFF"),
    );
  });

  it("uses Basic auth and returns audio bytes", async () => {
    const fetchImpl = vi.fn(async (_url, request) => {
      expect(request.headers.Authorization).toBe("Basic test-key");
      expect(JSON.parse(request.body).text).toBe("Narrate this.");
      return new Response(
        JSON.stringify({ audioContent: Buffer.from("RIFF").toString("base64") }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    await expect(
      synthesizeNarration({ apiKey: "test-key", text: "Narrate this.", fetchImpl }),
    ).resolves.toEqual(Buffer.from("RIFF"));
  });
});
