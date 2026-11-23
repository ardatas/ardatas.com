import type { CSSProperties } from 'react';
import options from '../../server/links/tag-options.json';

export type Tag = { id: string; revision?: number; name: string; icon: string; colour: string };
export function paperStyle(colour?: string): CSSProperties | undefined {
  return colour ? { '--paper': colour } as CSSProperties : undefined;
}

export function TagFields({ tag, change }: { tag: Tag; change: (tag: Tag) => void }) {
  return <>
    <label>Tag name<input autoFocus required maxLength={40} value={tag.name}
      onChange={e => change({ ...tag, name: e.target.value })}/></label>
    <div className="tag-preview" style={paperStyle(tag.colour)}>
      <span aria-hidden="true">{tag.icon}</span> {tag.name.trim() || 'Tag preview'}
    </div>
    {(['icon', 'colour'] as const).map(kind => {
      const choices = kind === 'icon' ? options.icons : options.colours;
      return <fieldset className="tag-options" key={kind}>
        <legend>{kind === 'icon' ? 'Icon' : 'Notebook colour'}</legend>
        <div className="tag-options-grid">{Object.entries(choices).map(([label, value]) =>
          <label className="tag-option" title={label} key={value}>
            <input type="radio" name={kind} aria-label={label} value={value} checked={tag[kind] === value}
              onChange={() => change({ ...tag, [kind]: value })}/>
            <span aria-hidden="true" style={kind === 'colour' ? { backgroundColor: value } : undefined}>{kind === 'icon' ? value : ''}</span>
          </label>)}</div>
      </fieldset>;
    })}
  </>;
}

export function newTag(): Tag {
  return { id: crypto.randomUUID(), name: '', icon: options.icons.Label, colour: options.colours.Butter };
}
