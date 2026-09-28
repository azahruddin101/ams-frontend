/** Re-mounts on every navigation, giving each page a short fade-in so route changes feel smooth instead of popping. */
export default function Template({ children }) {
  return <div className="animate-page">{children}</div>;
}
