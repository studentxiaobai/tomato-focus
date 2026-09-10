export function LoadingScreen({ label = '正在准备你的专注空间…' }: { label?: string }) {
  return (
    <main className="loading-screen">
      <div className="loading-mark">
        <span />
      </div>
      <p>{label}</p>
    </main>
  );
}
