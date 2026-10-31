import React, { useState } from 'react';
import {
  Star,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Send,
  HeartHandshake,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Languages,
  SlidersHorizontal,
  Tag,
} from 'lucide-react';
import { ReviewGateConfig } from '../types';
import {
  generateProceduralReviews,
  autoInferKeywords,
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
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // 4-5 Stars state
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customNote, setCustomNote] = useState('');
  const [customKeywords, setCustomKeywords] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'all' | ReviewLanguage>('all');
  const [selectedLength, setSelectedLength] = useState<'all' | ReviewLength>('all');
  const [tone, setTone] = useState<'enthusiastic' | 'friendly' | 'professional' | 'short_and_sweet'>('enthusiastic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [regenCount, setRegenCount] = useState(0);
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

  const availableTags =
    config.praiseTags && config.praiseTags.length > 0
      ? config.praiseTags
      : getPraiseTagsForCategory(businessCategory || 'Local Business');

  // Auto-inferred keyword suggestions for quick tapping
  const suggestedKeywords = autoInferKeywords(businessName, businessCategory);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddKeyword = (kw: string) => {
    const parts = customKeywords.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    if (!parts.includes(kw)) {
      parts.push(kw);
      setCustomKeywords(parts.join(', '));
    }
  };

  const handleGenerateReviews = async () => {
    setIsGenerating(true);
    setReviewDrafts([]);
    const nextIteration = regenCount + 1;
    setRegenCount(nextIteration);

    const tagsToUse =
      selectedTags.length > 0 ? selectedTags : availableTags.slice(0, 3);
    const dynamicCount = 4;

    try {
      const res = await fetch('/api/ai/generate-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          businessCategory,
          praiseTags: tagsToUse,
          customNotes: customNote,
          keywords: customKeywords,
          language: selectedLanguage,
          length: selectedLength,
          tone,
          iteration: nextIteration,
          requestedCount: dynamicCount,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate review');
      const data = await res.json();
      if (data.reviews && Array.isArray(data.reviews) && data.reviews.length >= 3) {
        setReviewDrafts(data.reviews);
        return;
      }
      throw new Error('Invalid reviews payload');
    } catch (err) {
      console.warn('AI Review Generation network error, using client-side procedural generator:', err);
      const fallback = generateProceduralReviews({
        businessName,
        businessCategory,
        praiseTags: tagsToUse,
        customNotes: customNote,
        keywords: customKeywords,
        language: selectedLanguage,
        length: selectedLength,
        tone,
        iteration: nextIteration,
        requestedCount: dynamicCount,
      });
      setReviewDrafts(fallback);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectAndCopyReview = async (draft: ReviewDraft) => {
    try {
      await navigator.clipboard.writeText(draft.text);
      setCopiedDraftId(draft.id);

      // Start countdown to open Google Reviews
      setRedirectingCountdown(2);
      const timer = setInterval(() => {
        setRedirectingCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            const googleUrl = config.googleReviewUrl || 'https://search.google.com/local/writereview';
            window.location.href = googleUrl;
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      const googleUrl = config.googleReviewUrl || 'https://search.google.com/local/writereview';
      window.location.href = googleUrl;
    }
  };

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
    } catch (err) {
      console.error('Failed to submit private feedback', err);
      setFeedbackSent(true);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between p-4 sm:p-6 antialiased selection:bg-amber-500 selection:text-neutral-950 font-sans">
      <div className="max-w-md w-full mx-auto my-auto space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-2 relative">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-0 top-0 text-neutral-400 hover:text-white p-2 text-xl leading-none"
            >
              &times;
            </button>
          )}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Verified Customer Experience</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {businessName}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400">
            How was your visit with us today?
          </p>
        </div>

        {/* Rating Stars Card */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl text-center space-y-5">
          {/* Star selector */}
          <div className="flex justify-center items-center gap-2 sm:gap-3 py-2">
            {[1, 2, 3, 4, 5].map((starValue) => {
              const isFilled = activeRating !== null && starValue <= activeRating;
              return (
                <button
                  key={starValue}
                  type="button"
                  onMouseEnter={() => setHoverRating(starValue)}
                  onMouseLeave={() => setHoverRating(null)}
                  onClick={() => {
                    setRating(starValue);
                    if (starValue >= (config.minRatingForGoogle || 4) && reviewDrafts.length === 0) {
                      if (selectedTags.length === 0 && availableTags.length > 0) {
                        setSelectedTags([availableTags[0], availableTags[1] || availableTags[0]]);
                      }
                    }
                  }}
                  className="group p-1 focus:outline-none transition-transform active:scale-90"
                  aria-label={`Rate ${starValue} stars`}
                >
                  <Star
                    className={`w-9 h-9 sm:w-11 sm:h-11 transition-all duration-200 ${
                      isFilled
                        ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)] scale-110'
                        : 'text-neutral-700 hover:text-neutral-500 hover:scale-105'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {rating === null && (
            <p className="text-xs text-neutral-500 font-medium">
              Tap a star above to rate your experience
            </p>
          )}

          {/* HIGH RATING (4-5 STARS) -> MULTILINGUAL AI REVIEW GENERATOR */}
          {isHighRating && (
            <div className="pt-2 border-t border-neutral-800/80 space-y-4 text-left animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="text-center space-y-1">
                <span className="text-xl">🎉</span>
                <h3 className="text-base font-bold text-white">
                  We're delighted you had a 5-star experience!
                </h3>
                <p className="text-xs text-neutral-400">
                  Select your preferred language & highlights. AI will draft authentic, human Google Reviews in 1 second!
                </p>
              </div>

              {/* 1. Language Tabs */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5 text-amber-400" />
                    <span>Review Language</span>
                  </span>
                  <span className="text-amber-400 text-[10px] lowercase">English, हिन्दी, ਪੰਜਾਬੀ</span>
                </div>
                <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-950 rounded-xl border border-neutral-800 text-xs">
                  {[
                    { id: 'all', label: '🌐 All' },
                    { id: 'en', label: 'English' },
                    { id: 'hi', label: 'हिन्दी' },
                    { id: 'pa', label: 'ਪੰਜਾਬੀ' },
                  ].map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setSelectedLanguage(l.id as any)}
                      className={`py-1.5 px-2 rounded-lg font-bold text-xs transition-all text-center truncate ${
                        selectedLanguage === l.id
                          ? 'bg-amber-500 text-neutral-950 shadow-xs'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Review Length Filter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Review Length</span>
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-950 rounded-xl border border-neutral-800 text-xs">
                  {[
                    { id: 'all', label: 'All Lengths' },
                    { id: 'short', label: '⚡ Short' },
                    { id: 'mid', label: '📝 Medium' },
                    { id: 'long', label: '📖 Story' },
                  ].map((len) => (
                    <button
                      key={len.id}
                      type="button"
                      onClick={() => setSelectedLength(len.id as any)}
                      className={`py-1.5 px-1.5 rounded-lg font-bold text-[11px] transition-all text-center truncate ${
                        selectedLength === len.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {len.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Praise Highlights (Tags) */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  What did you like most?
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`text-xs px-2.5 py-1 rounded-full transition-all font-medium border ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                            : 'bg-neutral-800/60 text-neutral-400 border-neutral-700/60 hover:border-neutral-500 hover:text-neutral-200'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Keywords / Context Input + Auto-Inferred Suggestions */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 flex justify-between">
                  <span>Keywords or Specific Dishes / Services</span>
                  <span className="text-neutral-500 lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  value={customKeywords}
                  onChange={(e) => setCustomKeywords(e.target.value)}
                  placeholder="e.g. paneer tikka, fast billing, painless haircut..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500"
                />

                {/* Auto inferred suggestions */}
                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <span className="text-[10px] text-neutral-500">Suggested:</span>
                  {suggestedKeywords.map((skw) => (
                    <button
                      key={skw}
                      type="button"
                      onClick={() => handleAddKeyword(skw)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-800/60 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700/60 transition-colors"
                    >
                      + {skw}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Personal Note (optional) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 flex justify-between">
                  <span>Special Note or Staff Name</span>
                  <span className="text-neutral-500 lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="e.g. Rahul was very polite and helpful..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerateReviews}
                disabled={isGenerating}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-neutral-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-neutral-950" />
                    <span>AI is drafting genuine reviews...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-neutral-950" />
                    <span>Generate Organic 5-Star Reviews</span>
                  </>
                )}
              </button>

              {/* Generated Drafts */}
              {reviewDrafts.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="font-semibold text-neutral-300">Pick your favorite review:</span>
                    <button
                      type="button"
                      onClick={handleGenerateReviews}
                      className="text-amber-400 hover:text-amber-300 text-[11px] flex items-center gap-1 font-semibold"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Regenerate Fresh
                    </button>
                  </div>

                  {reviewDrafts.map((draft) => {
                    const isCopied = copiedDraftId === draft.id;
                    const langBadge = draft.language === 'hi'
                      ? '🇮🇳 हिन्दी'
                      : draft.language === 'pa'
                      ? '🇮🇳 ਪੰਜਾਬੀ'
                      : '🇬🇧 English';
                    const lengthBadge = draft.length === 'short'
                      ? '⚡ Short'
                      : draft.length === 'long'
                      ? '📖 Story'
                      : '📝 Mid';

                    return (
                      <div
                        key={draft.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isCopied
                            ? 'bg-amber-500/10 border-amber-500/60 shadow-md'
                            : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                              {langBadge}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-neutral-800 text-neutral-300">
                              {lengthBadge}
                            </span>
                            <span className="text-[11px] font-bold text-neutral-300 truncate max-w-[130px]">
                              {draft.title}
                            </span>
                          </div>
                          <span className="text-amber-400 text-xs">★★★★★</span>
                        </div>

                        <p className="text-xs text-neutral-200 leading-relaxed mb-3">
                          "{draft.text}"
                        </p>

                        <button
                          type="button"
                          onClick={() => handleSelectAndCopyReview(draft)}
                          className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                            isCopied
                              ? 'bg-emerald-500 text-white'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 active:scale-98'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>
                                Copied! Opening Google Reviews {redirectingCountdown ? `(${redirectingCountdown}s)...` : '...'}
                              </span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-neutral-400" />
                              <span>1-Tap Copy & Open Google Reviews</span>
                              <ExternalLink className="w-3 h-3 text-neutral-500" />
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Direct Bypass Link */}
              <div className="pt-2 text-center">
                <a
                  href={config.googleReviewUrl || 'https://search.google.com/local/writereview'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-neutral-400 hover:text-white underline underline-offset-4 flex items-center justify-center gap-1.5"
                >
                  <span>Or write your own review directly on Google</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* LOW RATING (1-3 STARS) -> PRIVATE FEEDBACK GATEKEEPER */}
          {isLowRating && (
            <div className="pt-2 border-t border-neutral-800/80 space-y-4 text-left animate-in fade-in slide-in-from-bottom-2 duration-300">
              {feedbackSent ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                    <HeartHandshake className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white">Thank you for your honest feedback</h3>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
                    Your comments have been delivered directly to management so we can address this immediately.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitLowFeedback} className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">We're sorry your visit wasn't perfect</h3>
                    <p className="text-xs text-neutral-400">
                      Please tell our management team what happened so we can make things right.
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
                      Your Comments <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      required
                      placeholder="Please share what fell short and how we can improve..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
                        Your Name
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. John"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-700"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
                        Phone or Email
                      </label>
                      <input
                        type="text"
                        value={customerContact}
                        onChange={(e) => setCustomerContact(e.target.value)}
                        placeholder="For personal follow-up"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-700"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingFeedback || !feedbackText.trim()}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmittingFeedback ? (
                      <span>Sending...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Private Feedback to Owner</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-neutral-600 font-mono">
          /r/{slug} · TAPLOCAL.IN
        </div>
      </div>
    </div>
  );
};
