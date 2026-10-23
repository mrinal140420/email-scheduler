'use client';

import React from 'react';
import { Search, X, Loader2, Sparkles } from 'lucide-react';

interface SearchBarProps {
  query: string;
  onChange: (val: string) => void;
  onClear: () => void;
  isSearching: boolean;
  totalHits?: number;
  source?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onChange,
  onClear,
  isSearching,
  totalHits,
  source,
}) => {
  return (
    <div className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search leads, subject, or email body via Elasticsearch..."
          className="w-full bg-[#141517] border border-[#2A2F35] text-gray-200 text-xs rounded-xl pl-10 pr-10 py-2.5 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        />
        {query && (
          <button
            onClick={onClear}
            className="absolute right-3 text-gray-400 hover:text-gray-200 p-0.5 rounded-full hover:bg-gray-800"
          >
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
            ) : (
              <X className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {query && totalHits !== undefined && (
        <div className="absolute -bottom-6 left-1 text-[11px] text-gray-400 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-blue-400" />
          <span>
            Found <strong className="text-gray-200">{totalHits}</strong> matching results{' '}
            {source === 'elasticsearch' ? '(Indexed by Elasticsearch)' : ''}
          </span>
        </div>
      )}
    </div>
  );
};
