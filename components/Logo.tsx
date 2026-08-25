export function Logo({ className }: { className?: string }) {
  return (
    <img 
      src="/logo.svg" 
      alt="Toby Logo" 
      className={className} 
    />
  );
}
