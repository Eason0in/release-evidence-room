import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const endpoint = "https://api.inworld.ai/tts/v1/voice";

export function buildPayload(
  text,
  {
    voiceId = "Dennis",
    modelId = "inworld-tts-2",
    sampleRateHertz = 22_050,
  } = {},
) {
  const normalizedText = text.trim();
  if (!normalizedText) throw new Error("Narration text is empty.");

  return {
    text: normalizedText,
    voiceId,
    modelId,
    audioConfig: {
      audioEncoding: "LINEAR16",
      sampleRateHertz,
    },
    deliveryMode: "BALANCED",
    applyTextNormalization: "ON",
  };
}

export function decodeAudioContent(payload) {
  if (!payload || typeof payload.audioContent !== "string" || !payload.audioContent) {
    throw new Error("Inworld response did not include audioContent.");
  }
  return Buffer.from(payload.audioContent, "base64");
}

export async function synthesizeNarration({
  apiKey,
  text,
  voiceId,
  modelId,
  sampleRateHertz,
  fetchImpl = fetch,
}) {
  if (!apiKey) throw new Error("INWORLD_API_KEY is required.");

  const authorization = apiKey.startsWith("Basic ") ? apiKey : `Basic ${apiKey}`;
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildPayload(text, { voiceId, modelId, sampleRateHertz })),
  });

  const payload = await response.json();
  if (!response.ok) {
    const detail = typeof payload?.message === "string" ? payload.message : `HTTP ${response.status}`;
    throw new Error(`Inworld TTS request failed: ${detail}`);
  }
  return decodeAudioContent(payload);
}

export async function main({
  env = process.env,
  cwd = process.cwd(),
  fetchImpl = fetch,
} = {}) {
  const inputPath = resolve(cwd, env.INWORLD_TEXT_FILE ?? "docs/demo-narration.txt");
  const outputPath = resolve(cwd, env.INWORLD_OUTPUT ?? "demo-output/demo-narration-inworld.wav");
  const text = await readFile(inputPath, "utf8");
  const audio = await synthesizeNarration({
    apiKey: env.INWORLD_API_KEY,
    text,
    voiceId: env.INWORLD_VOICE_ID ?? "Dennis",
    modelId: env.INWORLD_MODEL_ID ?? "inworld-tts-2",
    sampleRateHertz: Number(env.INWORLD_SAMPLE_RATE ?? 22_050),
    fetchImpl,
  });

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, audio);
  return outputPath;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((outputPath) => console.log(`Wrote ${outputPath}`))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
