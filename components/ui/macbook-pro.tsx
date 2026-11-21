import { useId, type SVGProps } from "react";

export interface MacbookProProps extends SVGProps<SVGSVGElement> {
  src?: string;
}

export function MacbookPro({ width = 650, height = 400, src, ...props }: MacbookProProps) {
  const screenClip = useId();
  return (
    <svg width={width} height={height} viewBox="0 0 650 400" fill="none" {...props}>
      <defs>
        <clipPath id={screenClip}><rect x="74.52" y="21.32" width="501.22" height="323.85" rx="5" /></clipPath>
      </defs>
      <path fill="#a4a5a7" d="M79.56,13.18h491.32c7.23,0,13.1,5.87,13.1,13.1v336.61H66.46V26.28c0-7.23,5.87-13.1,13.1-13.1Z" />
      <path fill="#222" d="M79.96,14.24h490.45c6.83,0,12.37,5.54,12.37,12.37v336.28H67.59V26.6c0-6.83,5.54-12.37,12.37-12.37Z" />
      <path fill="#000" d="M570.25,15.74H80.34c-6.12,0-11.08,4.96-11.08,11.08v336.07h512.08V26.82c0-6.12-4.96-11.08-11.08-11.08Z" />
      <rect fill="currentColor" x="74.52" y="21.32" width="501.22" height="323.85" rx="5" />
      {src && <image href={src} x="74.52" y="21.32" width="501.22" height="323.85" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${screenClip})`} />}
      <rect fill="#1d1d1d" x="69.09" y="350.51" width="512.11" height="12.48" />
      <path fill="#000" d="M298.14,21.02h54.07v6.5c0,1.56-1.27,2.82-2.82,2.82h-48.42c-1.56,0-2.82-1.27-2.82-2.82v-6.5Z" />
      <path fill="#080d4c" d="M325.11,25.14c-1.99.03-1.99-3.09,0-3.06,1.99-.03,1.99,3.09,0,3.06Z" />
      <path fill="#acadaf" d="M19.04,362.77h611.92v10.39c0,5.95-4.83,10.79-10.79,10.79H29.83c-5.95,0-10.79-4.83-10.79-10.79v-10.39Z" />
      <path fill="#8f9091" d="M278.11,362.6h94.05c0,3.63-2.95,6.58-6.58,6.58h-80.89c-3.63,0-6.58-2.95-6.58-6.58Z" />
      <path fill="#b9b9bb" d="M565.84 383.95h35.98l-1.76 1.44h-32.77zM48.43 383.95h35.98l-1.77 1.44H49.87z" />
      <path fill="#292929" d="M567.32 385.39h33.03l-1.62 1.43h-30.09zM49.9 385.39h33.03l-1.62 1.43H51.23z" />
    </svg>
  );
}
