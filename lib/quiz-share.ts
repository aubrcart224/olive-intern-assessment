import { parseQuizSpec, type QuizSpec } from "@/lib/quiz-spec";

function encodeBase64Url(value: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf-8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  const bytes = new TextEncoder().encode(value);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const withPadding = padded.padEnd(Math.ceil(padded.length / 4) * 4, "=");

  if (typeof Buffer !== "undefined") {
    return Buffer.from(withPadding, "base64").toString("utf-8");
  }

  const binary = atob(withPadding);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

export function encodeQuizSpecForUrl(spec: QuizSpec) {
  return encodeBase64Url(JSON.stringify(spec));
}

export function buildQuizPath(spec: QuizSpec) {
  return `/quiz?data=${encodeQuizSpecForUrl(spec)}`;
}

export function decodeQuizSpecFromUrlParam(value: string) {
  try {
    return parseQuizSpec(decodeBase64Url(value));
  } catch (error) {
    return {
      success: false as const,
      candidate: "",
      issues: [
        error instanceof Error ? error.message : "Failed to decode shared quiz link.",
      ],
    };
  }
}
