import { createClient } from "@supabase/supabase-js";
import { starterTags, type Notebook, type Session, type Tag } from "./model";

const url = import.meta.env.VITE_SUPABASE_URL;
export const cloud = url
  ? createClient(url, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
  : null;
export const storageMode = cloud ? "Private cloud" : "This browser";
const conflict = () =>
  new Error(
    "The session changed in another tab or device. Review its current state.",
  );
const empty = (): Notebook => ({ tags: [...starterTags], sessions: [] });

let opening: Promise<IDBDatabase> | undefined;
async function local(change?: (data: Notebook) => void): Promise<Notebook> {
  opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("track-notebook", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("notebook");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      opening = undefined;
      reject(request.error);
    };
  });
  const db = await opening;
  return new Promise((resolve, reject) => {
    const tx = db.transaction("notebook", change ? "readwrite" : "readonly");
    const store = tx.objectStore("notebook");
    const request = store.get("v1");
    let data: Notebook;
    tx.oncomplete = () => resolve(data);
    tx.onabort = () =>
      reject(tx.error ?? new Error("The data could not be saved."));
    request.onsuccess = () => {
      data = request.result ?? empty();
      if (change) {
        try {
          change(data);
          store.put(data, "v1");
        } catch (error) {
          reject(error);
          tx.abort();
        }
      }
    };
  });
}

async function rows<T>(table: string, owner: string, columns: string) {
  const all: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await cloud!
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
  if (!cloud) return local();
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
  if (!cloud)
    return local((data) => {
      if (
        data.tags.some((t) => t.name.toLowerCase() === tag.name.toLowerCase())
      )
        throw new Error("This tag already exists.");
      data.tags.push(tag);
    });
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
  if (!cloud)
    return local((data) => {
      if (previous) {
        const index = data.sessions.findIndex(
          (s) => s.id === session.id && s.revision === previous.revision,
        );
        if (index < 0) throw conflict();
        data.sessions[index] = session;
      } else {
        if (data.sessions.some((s) => s.ended_at === null)) throw conflict();
        data.sessions.push(session);
      }
    });
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
