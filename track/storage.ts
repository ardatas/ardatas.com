import { createClient } from "@supabase/supabase-js";
import { starterTags, type Notebook, type Session, type Tag } from "./model";

export const cloud = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, detectSessionInUrl: false } },
);
const conflict = () =>
  new Error(
    "The session changed in another tab or device. Review its current state.",
  );
async function rows<T>(table: string, owner: string, columns: string) {
  const all: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await cloud
      .from(table)
      .select(columns)
      .eq("owner_id", owner)
      .order("id")
      .range(offset, offset + 499);
    if (error) throw error;
    all.push(...(data as T[]));
    if (data.length < 500) return all;
  }
}
const tagFields = "id,name,color,emoji";
const sessionFields =
  "id,tag_id,started_at,ended_at,timezone,intervals,rating,revision";
export async function readNotebook(owner: string): Promise<Notebook> {
  const [tags, sessions] = await Promise.all([
    rows<Tag>("track_tags", owner, tagFields),
    rows<Session>("track_sessions", owner, sessionFields),
  ]);
  if (!tags.length) {
    const { error } = await cloud.from("track_tags").upsert(
      starterTags.map((tag) => ({ ...tag, owner_id: owner })),
      { onConflict: "owner_id,id", ignoreDuplicates: true },
    );
    if (error) throw error;
    return { tags: await rows<Tag>("track_tags", owner, tagFields), sessions };
  }
  return { tags, sessions };
}
export async function addTag(owner: string, tag: Tag) {
  const { error } = await cloud
    .from("track_tags")
    .insert({ ...tag, owner_id: owner });
  if (error) throw error;
}
export async function saveSession(
  owner: string,
  session: Session,
  previous?: Session,
) {
  if (!previous) {
    const { error } = await cloud
      .from("track_sessions")
      .insert({ ...session, owner_id: owner });
    if (error?.code === "23505") throw conflict();
    if (error) throw error;
    return;
  }
  const { data, error } = await cloud
    .from("track_sessions")
    .update({
      ended_at: session.ended_at,
      intervals: session.intervals,
      rating: session.rating,
      revision: session.revision,
    })
    .eq("owner_id", owner)
    .eq("id", previous.id)
    .eq("revision", previous.revision)
    .select("id");
  if (error) throw error;
  if (!data.length) throw conflict();
}
