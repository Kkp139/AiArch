import React from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown, File } from 'lucide-react';

export interface VaultCategory {
  id: string;
  name: string;
  group: 'CONCEPT' | 'CONSTRUCTION' | 'OTHER';
  fileCount: number;
}

export interface TreeViewProps {
  categories: VaultCategory[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
}

export function TreeView({ categories, selectedCategoryId, onSelectCategory }: TreeViewProps) {
  const conceptCategories = categories.filter((c) => c.group === 'CONCEPT');
  const constructionCategories = categories.filter((c) => c.group === 'CONSTRUCTION');
  const otherCategories = categories.filter((c) => c.group === 'OTHER');

  const renderGroup = (title: string, items: VaultCategory[]) => (
    <div style={{ marginBottom: '16px' }}>
      <div
        style={{
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: 'var(--text-muted)',
          marginBottom: '8px',
          paddingLeft: '8px',
        }}
      >
        {title} ({items.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {items.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                border: isSelected ? '1px solid var(--border-strong)' : '1px solid transparent',
                color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '13px',
                width: '100%',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                {isSelected ? (
                  <FolderOpen size={16} color="var(--accent-gold)" />
                ) : (
                  <Folder size={16} color="var(--text-muted)" />
                )}
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {cat.name}
                </span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: cat.fileCount > 0 ? 'var(--accent-gold)' : 'var(--bg-surface)',
                  color: cat.fileCount > 0 ? '#0d0f12' : 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                {cat.fileCount}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      style={{
        width: '280px',
        borderRight: '1px solid var(--border-subtle)',
        padding: '16px',
        overflowY: 'auto',
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      {renderGroup('Concept Design', conceptCategories)}
      {renderGroup('Construction Drawings', constructionCategories)}
      {renderGroup('General / Catch-All', otherCategories)}
    </div>
  );
}
