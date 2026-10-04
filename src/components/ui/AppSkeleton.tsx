import { Skeleton } from './Skeleton'

export function GlobalLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: 'var(--bg-default, #111b21)' }}>
      <div className="global-spinner" />
    </div>
  )
}

export function InboxSkeleton() {
  return (
    <aside className="inbox-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header className="inbox-header" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Skeleton variant="text" width={120} height={28} />
        <Skeleton variant="circular" width={36} height={36} />
      </header>
      
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Skeleton variant="rectangular" height={40} style={{ borderRadius: '20px' }} />
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', gap: '16px', marginBottom: '16px' }}>
        <Skeleton variant="text" width={60} height={24} style={{ borderRadius: '12px' }} />
        <Skeleton variant="text" width={80} height={24} style={{ borderRadius: '12px' }} />
      </div>

      <div style={{ flex: 1, padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 8px', gap: '12px' }}>
            <Skeleton variant="circular" width={48} height={48} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Skeleton variant="text" width="60%" height={16} />
              <Skeleton variant="text" width="80%" height={14} />
            </div>
            <Skeleton variant="text" width={32} height={12} />
          </div>
        ))}
      </div>
    </aside>
  )
}

export function ChatSkeleton() {
  return (
    <section className="chat-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
      <header className="chat-header" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(128, 128, 128, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Skeleton variant="circular" width={40} height={40} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Skeleton variant="text" width={150} height={18} />
            <Skeleton variant="text" width={80} height={12} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Skeleton variant="circular" width={36} height={36} />
          <Skeleton variant="circular" width={36} height={36} />
          <Skeleton variant="circular" width={36} height={36} />
        </div>
      </header>
      
      <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', alignSelf: 'flex-start', maxWidth: '70%' }}>
          <Skeleton variant="circular" width={32} height={32} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
             <Skeleton variant="rectangular" width={200} height={60} style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px', borderBottomRightRadius: '16px', borderBottomLeftRadius: '4px' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', alignSelf: 'flex-end', maxWidth: '70%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
             <Skeleton variant="rectangular" width={240} height={80} style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px', borderBottomLeftRadius: '16px', borderBottomRightRadius: '4px' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', alignSelf: 'flex-start', maxWidth: '70%' }}>
          <Skeleton variant="circular" width={32} height={32} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
             <Skeleton variant="rectangular" width={160} height={40} style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px', borderBottomRightRadius: '16px', borderBottomLeftRadius: '4px' }} />
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', borderTop: '1px solid rgba(128, 128, 128, 0.1)' }}>
         <Skeleton variant="rectangular" height={52} style={{ borderRadius: '26px' }} />
      </div>
    </section>
  )
}
