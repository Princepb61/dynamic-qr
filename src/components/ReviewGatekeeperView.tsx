import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Star,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Send,
  RefreshCw,
  Languages,
  CheckCircle2,
  Heart,
  ChevronRight,
} from 'lucide-react';
import { ReviewGateConfig } from '../types';
import {
  generateProceduralReviews,
  ReviewLanguage,
  ReviewLength,
} from '../utils/proceduralReviewGenerator';
import { getPraiseTagsForCategory } from '../utils/categoryTags';

interface ReviewGatekeeperViewProps {
  businessName: string;
  businessCategory?: string;
  config: ReviewGateConfig;
  slug: string;
  onFeedbackSubmitted?: () => void;
  onClose?: () => void;
}

interface ReviewDraft {
  id: number;
  title: string;
  text: string;
  language?: ReviewLanguage;
  length?: ReviewLength;
  badge?: string;
}

export const ReviewGatekeeperView: React.FC<ReviewGatekeeperViewProps> = ({
  businessName,
  businessCategory = 'Local Business',
  config,
  slug,
  onFeedbackSubmitted,
  onClose,
}) => {
  // Default to 5-star experience so tags & reviews appear immediately without delay
  const [rating, setRating] = useState<number | null>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // Available tags from link config or category preset
  const availableTags = useMemo(() => {
    if (config?.praiseTags && Array.isArray(config.praiseTags) && config.praiseTags.length > 0) {
      return config.praiseTags;
    }
    return getPraiseTagsForCategory(businessCategory || config?.businessCategory || 'Local Business');
  }, [config?.praiseTags, businessCategory, config?.businessCategory]);

  // Selected tags - initially select the first 2-3 tags for instant review synthesis
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    if (availableTags && availableTags.length > 0) {
      return availableTags.slice(0, Math.min(3, availableTags.length));
    }
    return [];
  });

  const [selectedLanguage, setSelectedLanguage] = useState<'all' | ReviewLanguage>('all');
  const [regenSeed, setRegenSeed] = useState(1);
  const [reviewDrafts, setReviewDrafts] = useState<ReviewDraft[]>([]);
  const [copiedDraftId, setCopiedDraftId] = useState<number | null>(null);
  const [redirectingCountdown, setRedirectingCountdown] = useState<number | null>(null);

  // 1-3 Stars state (Private feedback)
  const [feedbackText, setFeedbackText] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const activeRating = hoverRating !== null ? hoverRating : rating;
  const isHighRating = rating !== null && rating >= (config.minRatingForGoogle || 4);
  const isLowRating = rating !== null && rating < (config.minRatingForGoogle || 4);

  // Instant, 0ms review generator function based on current tags and language
  const produceInstantReviews = useCallback(
    (tags: string[], lang: 'all' | ReviewLanguage, seed: number) => {
      const activePraise = tags.length > 0 ? tags : availableTags.slice(0, 2);
      const effectiveCategory = businessCategory || config?.businessCategory || 'Local Business';
      const effectiveName = businessName || config?.businessName || 'This Business';

      const results = generateProceduralReviews({
        businessName: effectiveName,
        businessCategory: effectiveCategory,
        praiseTags: activePraise,
        language: lang,
        length: 'all',
        iteration: seed,
        requestedCount: 2, // Exactly 1-2 authentic reviews
      });

      // Ensure badges look polished and scannable
      return results.slice(0, 2).map((r, idx) => ({
        ...r,
        badge: idx === 0 ? '✨ Most Popular & Authentic' : '⚡ Short & Impactful',
      }));
    },
    [availableTags, businessCategory, config?.businessCategory, businessName, config?.businessName]
  );

  // Generate 1-2 reviews IMMEDIATELY on mount and whenever tags/language change
  useEffect(() => {
    if (isHighRating) {
      const drafts = produceInstantReviews(selectedTags, selectedLanguage, regenSeed);
      setReviewDrafts(drafts);
    }
  }, [produceInstantReviews, selectedTags, selectedLanguage, regenSeed, isHighRating]);

  // Toggle tag selection with instant review update
  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag];
      return next;
    });
    setRegenSeed((s) => s + 1);
  };

  // Switch language instantly
  const handleLanguageChange = (lang: 'all' | ReviewLanguage) => {
    setSelectedLanguage(lang);
    setRegenSeed((s) => s + 1);
  };

  // Re-roll alternate reviews instantly
  const handleReroll = () => {
    setRegenSeed((s) => s + 1);
  };

  // Helper to ensure direct write-review dialog URL
  const getDirectReviewUrl = (rawUrl?: string) => {
    if (!rawUrl || !rawUrl.trim()) return 'https://search.google.com/local/writereview';
    const trimmed = rawUrl.trim();
    if (trimmed.startsWith('ChIJ')) {
      return `https://search.google.com/local/writereview?placeid=${trimmed}`;
    }
    return trimmed;
  };

  // Copy review to clipboard and open Google Reviews immediately (smooth & instant)
  const handleCopyAndOpenGoogle = async (draft: ReviewDraft) => {
    setCopiedDraftId(draft.id);
    const googleUrl = getDirectReviewUrl(config.googleReviewUrl);

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(draft.text);
      }
    } catch {
      // Fallback if clipboard permission is restricted
    }

    // Instant redirect without delay: smooth and immediate
    window.location.href = googleUrl;
  };

  // Submit 1-3 star private feedback
  const handleSubmitLowFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    setIsSubmittingFeedback(true);
    try {
      await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          rating: rating || 3,
          customerName: customerName.trim() || undefined,
          customerContact: customerContact.trim() || undefined,
          feedbackText: feedbackText.trim(),
          tags: selectedTags,
        }),
      });
      setFeedbackSent(true);
      if (onFeedbackSubmitted) onFeedbackSubmitted();
    } catch {
      setFeedbackSent(true);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between p-3.5 sm:p-6 antialiased selection:bg-amber-500 selection:text-neutral-950 font-sans">
      <div className="max-w-lg w-full mx-auto my-auto space-y-4 sm:space-y-5">
        {/* Top Header */}
        <div className="text-center space-y-2 relative pt-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-0 top-0 text-neutral-400 hover:text-white p-2 text-2xl leading-none"
              aria-label="Close"
            >
              &times;
            </button>
          )}

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Google 5-Star Reviews</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            {businessName || 'Our Business'}
          </h1>

          <p className="text-xs sm:text-sm text-neutral-400 font-medium">
            How was your visit with us today?
          </p>
        </div>

        {/* Rating Card */}
        <div className="bg-neutral-900/95 border border-neutral-800 rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl space-y-5">
          {/* Star selector */}
          <div className="text-center space-y-2">
            <div className="flex justify-center items-center gap-2 sm:gap-3 py-1">
              {[1, 2, 3, 4, 5].map((starValue) => {
                const isFilled = activeRating !== null && starValue <= activeRating;
                return (
                  <button
                    key={starValue}
                    type="button"
                    onMouseEnter={() => setHoverRating(starValue)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setRating(starValue)}
                    className="p-1 focus:outline-none transition-transform active:scale-90"
                    aria-label={`Rate ${starValue} stars`}
                  >
                    <Star
                      className={`w-9 h-9 sm:w-11 sm:h-11 transition-all duration-150 ${
                        isFilled
                          ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_14px_rgba(251,191,36,0.7)] scale-110'
                          : 'text-neutral-700 hover:text-neutral-500 hover:scale-105'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            {rating === 5 && (
              <span className="text-xs font-bold text-amber-400 tracking-wide uppercase">
                5-Star Excellent Experience
              </span>
            )}
          </div>

          {/* 4-5 STARS: SHOW BIG READABLE TAGS FIRST, THEN INSTANT 1-2 REVIEWS */}
          {isHighRating && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* SECTION 1: BIG VISIBLE PRAISE TAGS */}
              <div className="space-y-2.5 pt-2 border-t border-neutral-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span>What did you enjoy most?</span>
                  </label>
                  <span className="text-[11px] text-amber-400 font-semibold">
                    Tap to customize
                  </span>
                </div>

                {/* Big, bold, easily readable tags */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {availableTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleTag(tag)}
                        className={`text-xs sm:text-sm font-bold px-3.5 sm:px-4 py-2.5 rounded-2xl transition-all duration-150 border flex items-center gap-2 active:scale-95 ${
                          isSelected
                            ? 'bg-amber-400 text-neutral-950 border-amber-300 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/40'
                            : 'bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:bg-neutral-700 hover:text-white hover:border-neutral-500'
                        }`}
                      >
                        {isSelected ? (
                          <Check className="w-4 h-4 text-neutral-950 stroke-[3]" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-neutral-600" />
                        )}
                        <span>{tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: LANGUAGE SELECTOR & RE-ROLL */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="inline-flex items-center p-1 bg-neutral-950 rounded-xl border border-neutral-800 text-xs font-bold">
                  <Languages className="w-3.5 h-3.5 text-neutral-500 ml-1.5 mr-1" />
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'en', label: 'English' },
                    { id: 'hi', label: 'हिन्दी' },
                    { id: 'pa', label: 'ਪੰਜਾਬੀ' },
                  ].map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => handleLanguageChange(l.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedLanguage === l.id
                          ? 'bg-amber-500 text-neutral-950'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleReroll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-bold transition-all border border-neutral-700"
                  title="Generate alternative phrasing"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Shuffle</span>
                </button>
              </div>

              {/* SECTION 3: 1 OR 2 INSTANT AUTHENTIC REVIEWS */}
              <div className="space-y-3.5 pt-1">
                <div className="flex items-center justify-between text-xs text-neutral-400 font-medium">
                  <span className="font-bold text-neutral-200">
                    Pick a review & post on Google in 1 tap:
                  </span>
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Ready</span>
                  </span>
                </div>

                {reviewDrafts.map((draft, idx) => {
                  const isCopied = copiedDraftId === draft.id;

                  return (
                    <div
                      key={draft.id || idx}
                      className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg relative group hover:border-amber-500/50 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                          {draft.badge || (idx === 0 ? '✨ Authentic Review' : '⚡ Quick Review')}
                        </span>
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className="w-3.5 h-3.5 fill-amber-400" />
                          ))}
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-medium">
                        "{draft.text}"
                      </p>

                      {/* Primary One-Tap Copy & Post Button */}
                      <button
                        type="button"
                        onClick={() => handleCopyAndOpenGoogle(draft)}
                        className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] ${
                          isCopied
                            ? 'bg-emerald-500 text-neutral-950 shadow-emerald-500/30'
                            : 'bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 text-neutral-950 hover:brightness-105 shadow-amber-500/20'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-4 h-4 text-neutral-950 stroke-[3]" />
                            <span>Copied! Opening Google Reviews...</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-neutral-950" />
                            <span>Copy & Post on Google</span>
                            <ExternalLink className="w-3.5 h-3.5 text-neutral-950 ml-0.5" />
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Direct Link to Google Reviews */}
              <div className="text-center pt-1">
                <a
                  href={getDirectReviewUrl(config.googleReviewUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white underline underline-offset-4 font-semibold"
                >
                  <span>Or write your own review directly on Google</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* 1-3 STARS: PRIVATE FEEDBACK FORM */}
          {isLowRating && (
            <div className="pt-2 border-t border-neutral-800 space-y-4 text-left animate-in fade-in duration-200">
              {feedbackSent ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-white">Thank you for your honesty</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed max-w-xs mx-auto">
                    Your message has been sent directly to management. We appreciate your feedback and will work to make it right.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitLowFeedback} className="space-y-3.5">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-amber-400" />
                      <span>We're sorry your experience wasn't perfect</span>
                    </h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Please let our management team know what went wrong so we can resolve this immediately:
                    </p>
                  </div>

                  <div>
                    <textarea
                      rows={3}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Tell us what happened..."
                      required
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your name (optional)"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="text"
                      value={customerContact}
                      onChange={(e) => setCustomerContact(e.target.value)}
                      placeholder="Phone or email (optional)"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingFeedback || !feedbackText.trim()}
                    className="w-full py-3 px-4 rounded-xl bg-neutral-100 hover:bg-white text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingFeedback ? 'Sending...' : 'Send Privately to Management'}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-neutral-500">
          <span>Powered by </span>
          <span className="font-bold text-neutral-400">TapLocal</span>
        </div>
      </div>
    </div>
  );
};
