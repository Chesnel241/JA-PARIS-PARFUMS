// Pictogrammes au trait fin de la charte (couleur : currentColor).
type IconProps = { className?: string };

const base = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, focusable: false };

export function ArrowIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 16 16" strokeWidth={1.8} {...base}><path d="M3 8h10M9 4l4 4-4 4" /></svg>;
}

export function PlusIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 16 16" strokeWidth={1.8} {...base}><path d="M8 3v10M3 8h10" /></svg>;
}

export function CloseIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" strokeWidth={1.5} {...base}><path d="M6 6l12 12M18 6 6 18" /></svg>;
}

export function SearchIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" strokeWidth={1.5} {...base}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.6-4.6" /></svg>;
}

export function BagIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" strokeWidth={1.5} {...base}><path d="M5 8h14l-1.2 12H6.2z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></svg>;
}

export function MenuIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" strokeWidth={1.5} {...base}><path d="M4 8h16M4 16h10" /></svg>;
}

export function TruckIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" strokeWidth={1.5} {...base}><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17.5" cy="17.5" r="1.6" /></svg>;
}

export function ReturnIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" strokeWidth={1.5} {...base}><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4h4" /></svg>;
}

export function LockIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" strokeWidth={1.5} {...base}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
}

export function ClockIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" strokeWidth={1.5} {...base}><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></svg>;
}

export function PlusMinusIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 12 12" strokeWidth={1.8} {...base}><path d="M6 1v10M1 6h10" /></svg>;
}
