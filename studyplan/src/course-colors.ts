import type { CSSProperties } from 'react';
export const courseColors:Record<string,string>={gdb:'#60a5fa',gbs:'#4ade80',its:'#fbbf24',ana:'#fb7185',num:'#c4a5fd'};
const courseSurfaces:Record<string,string>={gdb:'#142e4d',gbs:'#153629',its:'#3c3018',ana:'#3d2331',num:'#302348'};
export const courseStyle=(course:string,kind?:string):CSSProperties=>{
 const color=courseColors[course]||'#7dc3ff';const surface=courseSurfaces[course]||'#10243c';
 return {'--event-color':kind==='Lecture'?`color-mix(in srgb, ${color} 65%, white)`:color,'--event-surface':kind==='Lecture'?`color-mix(in srgb, ${color} 30%, ${surface})`:surface} as CSSProperties;
};
