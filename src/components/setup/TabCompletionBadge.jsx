import React from 'react';

/**
 * Props:
 *  status: 'complete' | 'partial' | 'empty'
 */
export function TabCompletionBadge({ status }) {
  if (status === 'complete') return <span className="tab-badge tab-badge--complete">✓</span>;
  if (status === 'partial')  return <span className="tab-badge tab-badge--partial">◎</span>;
  return null;
}
