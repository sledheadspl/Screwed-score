export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(0,229,255,0.4)', borderTopColor: 'transparent' }} />
    </div>
  )
}
