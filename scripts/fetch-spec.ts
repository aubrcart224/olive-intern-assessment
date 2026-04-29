// Simple script to fetch a quiz spec by ID and save it to a file
// Usage: npx tsx scripts/fetch-spec.ts <quiz-id>

import { createServerClient } from "@/lib/supabase";
import * as fs from "fs";

async function fetchSpec(quizId: string) {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from("quizzes")
    .select("id, title, spec_json, created_at")
    .eq("id", quizId)
    .single();
    
  if (error || !data) {
    console.error("Error fetching quiz:", error);
    process.exit(1);
  }
  
  const filename = `examples/quiz-${quizId.slice(0, 8)}.json`;
  fs.writeFileSync(filename, JSON.stringify(data.spec_json, null, 2));
  
  console.log(`Saved spec to: ${filename}`);
  console.log(`Quiz title: ${data.title}`);
  console.log(`Created: ${data.created_at}`);
}

const quizId = process.argv[2];
if (!quizId) {
  console.log("Usage: npx tsx scripts/fetch-spec.ts <quiz-id>");
  process.exit(1);
}

fetchSpec(quizId);
