import React, { useState, useEffect, useRef } from 'react';

export interface PlaceResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  rating?: number;
  userRatingsTotal?: number;
  category?: string;
  googleReviewUrl: string;
  mapsUrl: string;
  suggestedTags?: string[];
}

interface GooglePlaceSearchInputProps {
  onSelectPlace: (place: PlaceResult) => void;
  initialQuery?: string;
  placeholder?: string;
}

export const GooglePlaceSearchInput: React.FC<GooglePlaceSearchInputProps> = ({
  onSelectPlace,
  initialQuery = '',
  placeholder = 'Search business name and city (e.g. Spice Court Jaipur)...',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (text: string) => {
    setQuery(text);
    setSelectedPlace(null);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (text.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/places/search?query=${encodeURIComponent(text.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.places)) {
            setResults(data.places);
            setIsOpen(data.places.length > 0);
          }
        }
      } catch (err) {
        console.error('Failed to search Google Places:', err);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const handleSelect = (place: PlaceResult) => {
    setSelectedPlace(place);
    setQuery(place.name);
    setIsOpen(false);
    onSelectPlace(place);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
          {loading ? (
            <svg className="animate-spin h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pl-9.5 pr-8 py-2.5 text-xs bg-neutral-900 border border-neutral-700/80 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/80 transition-colors shadow-inner"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setSelectedPlace(null);
              setIsOpen(false);
            }}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-neutral-500 hover:text-white"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Selected Verified Place Preview Pill */}
      {selectedPlace && (
        <div className="mt-2 p-2.5 bg-amber-950/20 border border-amber-800/40 rounded-xl flex items-start justify-between gap-2 text-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>{selectedPlace.name}</span>
              {selectedPlace.rating && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30 font-mono">
                  ★ {selectedPlace.rating} ({selectedPlace.userRatingsTotal || 100}+)
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-300 truncate max-w-sm">{selectedPlace.formattedAddress}</p>
            <div className="text-[10px] text-neutral-400 font-mono flex items-center gap-1">
              <span>Place ID:</span>
              <span className="text-amber-400/90 truncate max-w-xs">{selectedPlace.placeId}</span>
            </div>
          </div>

          <a
            href={selectedPlace.googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-[10px] px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors inline-flex items-center gap-1"
          >
            <span>Test Review Link</span>
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden divide-y divide-neutral-800 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1.5 bg-neutral-950/80 text-[10px] uppercase font-bold tracking-wider text-neutral-400 flex items-center justify-between">
            <span>Verified Google Places</span>
            <span className="text-amber-400">Select to Auto-Fill</span>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {results.map((place, idx) => (
              <button
                key={place.placeId || idx}
                type="button"
                onClick={() => handleSelect(place)}
                className="w-full text-left p-3 hover:bg-neutral-800/80 transition-colors flex items-start gap-2.5 group"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                      {place.name}
                    </span>
                    {place.rating && (
                      <span className="text-[10px] font-mono font-bold text-amber-400 shrink-0">
                        ★ {place.rating}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 truncate leading-relaxed">
                    {place.formattedAddress}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-500">
                    <span className="text-neutral-400">{place.category || 'Local Business'}</span>
                    <span>·</span>
                    <span className="font-mono truncate">{place.placeId}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
