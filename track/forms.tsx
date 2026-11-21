import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import { colors, type Tag } from "./model";

export function Dialog({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="panel-heading">
        <h2 id="dialog-title">{title}</h2>
        <button className="icon" aria-label="Close dialog" onClick={close}>
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
const emojiChoices = [
  "📖",
  "🎓",
  "✏️",
  "💻",
  "🧠",
  "🧪",
  "🧮",
  "🔬",
  "📐",
  "🌱",
  "🎧",
  "📝",
];
export function TagForm({
  submit,
  busy,
}: {
  submit: (tag: Tag) => void;
  busy: boolean;
}) {
  const [emoji, setEmoji] = useState(emojiChoices[0]);
  const [color, setColor] = useState(colors[0]);
  const [name, setName] = useState("");
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim() && emoji.trim())
          submit({
            id: crypto.randomUUID(),
            name: name.trim(),
            color,
            emoji: emoji.trim(),
          });
      }}
    >
      <label>
        Tag name
        <input
          maxLength={40}
          required
          placeholder="e.g. Linear algebra"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <fieldset>
        <legend>Emoji</legend>
        <div className="choices emojis">
          {emojiChoices.map((item) => (
            <button
              type="button"
              key={item}
              aria-pressed={emoji === item}
              onClick={() => setEmoji(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="custom-emoji">
          Custom emoji
          <input
            aria-label="Custom emoji"
            value={emoji}
            maxLength={16}
            required
            onChange={(e) => setEmoji(e.target.value)}
          />
        </label>
      </fieldset>
      <fieldset>
        <legend>Colour</legend>
        <div className="choices">
          {colors.map((c, i) => (
            <button
              type="button"
              key={c}
              className="swatch"
              style={{ background: c }}
              aria-label={
                [
                  "Blue",
                  "Green",
                  "Purple",
                  "Orange",
                  "Rose",
                  "Teal",
                  "Olive",
                  "Slate",
                ][i]
              }
              aria-pressed={color === c}
              onClick={() => setColor(c)}
            >
              {color === c && <Check />}
            </button>
          ))}
        </div>
      </fieldset>
      <button
        className="primary"
        disabled={busy || !name.trim() || !emoji.trim()}
      >
        Create tag
      </button>
    </form>
  );
}
