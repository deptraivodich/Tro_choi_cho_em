import React from 'react';

// Router 58 no longer measures safe-area-context insets on web.
// Let browser CSS insets protect every route; native keeps its existing insets.
export function RootSafeArea({ children }: { children: React.ReactNode }) {
  return <div style={{
    display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0,
    boxSizing: 'border-box', width: '100%',
    paddingTop: 'env(safe-area-inset-top, 0px)',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    paddingLeft: 'env(safe-area-inset-left, 0px)',
    paddingRight: 'env(safe-area-inset-right, 0px)',
  }}>{children}</div>;
}
