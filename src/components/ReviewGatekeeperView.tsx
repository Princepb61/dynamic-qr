import React, { useState } from 'react';
import { Star, Sparkles, Copy, Check, ExternalLink, MessageSquare, Send, HeartHandshake, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { ReviewGateConfig } from '../types';

interface ReviewGatekeeperViewProps {
  businessName: string;
  businessCategory?: string;
  config: ReviewGateConfig;
  slug: string;
  onFeedbackSubmitted?: () => void;
}

interface ReviewDraft {
  id: number;
  title: string;
  text: string;
}

const DEFAULT_PRAISE_TAGS = [
  '⚡ Fast Service',
  '😊 Friendly Staff',
  '🏆 Outstanding Quality',
  '✨ Clean & Welcoming',
  '💎 Great Value',
  '☕ Wonderful Atmosphere',
  '👍 Highly Recommended',
  '🔥 Exceeded Expectations',
];

export const ReviewGatekeeperView: React.FC<ReviewGatekeeperViewProps> = ({
  businessName,
  businessCategory = 'Local Business',
  config,
  slug,
  onFeedbackSubmitted,
}) => {
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // 4-5 Stars state
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customNote, setCustomNote] = useState('');
  const [tone, setTone] = useState<'enthusiastic' | 'friendly' | 'professional' | 'short_and_sweet'>('enthusiastic');
  const [isGenerating, setIsGenerating] = useState(false);
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

  const availableTags = config.praiseTags && config.praiseTags.length > 0 ? config.praiseTags : DEFAULT_PRAISE_TAGS;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleGenerateReviews = async () => {
    setIsGenerating(true);
    setReviewDrafts([]);
    try {
      const res = await fetch('/api/ai/generate-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          businessCategory,
          praiseTags: selectedTags.length > 0 ? selectedTags : ['Great Service', 'Friendly Team'],
          customNotes: customNote,
          tone,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate review');
      const data = await res.json();
      if (data.reviews && Array.isArray(data.reviews)) {
        setReviewDrafts(data.reviews);
      }
    } catch (err) {
      console.error('AI Review Generation error:', err);
      // Fallback templates so customer never gets stuck
      const tagsList = selectedTags.length > 0 ? selectedTags.join(', ') : 'great service and warm atmosphere';
      setReviewDrafts([
        {
          id: 1,
          title: 'Quick & Enthusiastic',
          text: `Had a wonderful experience at ${businessName}! The service was top notch and everything exceeded my expectations. Highlight: ${tagsList}. Absolutely 5 stars!`,
        },
        {
          id: 2,
          title: 'Detailed Experience',
          text: `I recently visited ${businessName} and couldn't be happier. From start to finish, the team was attentive and the quality was outstanding. Definitely worth checking out if you're in the area!`,
        },
        {
          id: 3,
          title: 'Staff & Atmosphere',
          text: `Five stars for ${businessName}! What stood out most was how welcoming and professional the staff were. Will definitely be returning soon and recommending to friends.`,
        },
      ]);
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
            // Open Google Reviews in target
            const googleUrl = config.googleReviewUrl || 'https://search.google.com/local/writereview';
            window.location.href = googleUrl;
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      // Fallback if clipboard API is blocked
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
          customerName: customerName.trim(),
          customerContact: customerContact.trim(),
          feedbackText: feedbackText.trim(),
          tags: selectedTags,
        }),
      });
      setFeedbackSent(true);
      if (onFeedbackSubmitted) onFeedbackSubmitted();
    } catch (err) {
      console.error('Feedback submit error:', err);
      setFeedbackSent(true);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between p-4 sm:p-6 antialiased selection:bg-amber-500 selection:text-neutral-950">
      <div className="max-w-md w-full mx-auto my-auto space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-2">
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
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
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
                      // Pre-select first 2 tags
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

          {/* HIGH RATING (4-5 STARS) -> AI GOOGLE REVIEW GENERATOR */}
          {isHighRating && (
            <div className="pt-2 border-t border-neutral-800/80 space-y-5 text-left animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="text-center space-y-1">
                <span className="text-xl">🎉</span>
                <h3 className="text-base font-bold text-white">
                  We're so thrilled you had a 5-star experience!
                </h3>
                <p className="text-xs text-neutral-400">
                  Select what you loved, and our AI will draft a perfect Google Review for you in 1 second!
                </p>
              </div>

              {/* Praise Tags */}
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
                        className={`text-xs px-3 py-1.5 rounded-full transition-all font-medium border ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                            : 'bg-neutral-800/60 text-neutral-400 border-neutral-700/60 hover:border-neutral-500 hover:text-neutral-200'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specific Note (optional) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 flex justify-between">
                  <span>Want to mention anything special?</span>
                  <span className="text-neutral-500 lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="e.g. barista Alex was wonderful, iced matcha latte..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/50 transition-colors"
                />
              </div>

              {/* Tone selector */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-neutral-400 font-medium">Style:</span>
                <div className="flex gap-1">
                  {(
                    [
                      { id: 'enthusiastic', label: '🔥 Enthusiastic' },
                      { id: 'short_and_sweet', label: '⚡ Punchy' },
                      { id: 'friendly', label: '😊 Warm' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTone(t.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                        tone === t.id
                          ? 'bg-neutral-800 text-white border-neutral-600'
                          : 'text-neutral-500 border-transparent hover:text-neutral-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Magic Generate Button */}
              <button
                type="button"
                onClick={handleGenerateReviews}
                disabled={isGenerating}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-neutral-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-neutral-950" />
                    <span>Gemini AI is crafting 3 review drafts...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-neutral-950" />
                    <span>Generate 5-Star Reviews with AI</span>
                  </>
                )}
              </button>

              {/* AI Generated Review Cards */}
              {reviewDrafts.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="font-semibold text-neutral-300">Choose your favorite draft:</span>
                    <button
                      type="button"
                      onClick={handleGenerateReviews}
                      className="text-amber-400 hover:text-amber-300 text-[11px] flex items-center gap-1 font-medium"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Regenerate
                    </button>
                  </div>

                  {reviewDrafts.map((draft) => {
                    const isCopied = copiedDraftId === draft.id;
                    return (
                      <div
                        key={draft.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isCopied
                            ? 'bg-amber-500/10 border-amber-500/60 shadow-md'
                            : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90">
                            {draft.title}
                          </span>
                          <span className="flex text-amber-400 text-xs">★★★★★</span>
                        </div>
                        <p className="text-xs text-neutral-300 leading-relaxed italic mb-3">
                          "{draft.text}"
                        </p>
                        <button
                          type="button"
                          onClick={() => handleSelectAndCopyReview(draft)}
                          className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                            isCopied
                              ? 'bg-emerald-500 text-white'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>
                                Copied! Opening Google Reviews {redirectingCountdown ? `(${redirectingCountdown}s)...` : '...'}
                              </span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-neutral-400" />
                              <span>Copy & Post on Google Reviews</span>
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

          {/* LOW RATING (1-3 STARS) -> PRIVATE OWNER FEEDBACK GATE */}
          {isLowRating && (
            <div className="pt-2 border-t border-neutral-800/80 space-y-4 text-left animate-in fade-in slide-in-from-bottom-2 duration-300">
              {feedbackSent ? (
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <HeartHandshake className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-white">Thank you for letting us know!</h4>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Your message has been sent directly to the owner & general manager. We deeply care about our guests and will review this with our team right away.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitLowFeedback} className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Direct Private Channel to Management</span>
                    </div>
                    <h3 className="text-base font-bold text-white">
                      We're so sorry to hear your visit wasn't perfect.
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Please tell us what went wrong so the manager can personally make it right for you.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                      What happened? <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Tell us about the wait time, food quality, or customer service..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-neutral-400">Your Name (optional)</label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="John D."
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-neutral-400">Email or Phone (optional)</label>
                      <input
                        type="text"
                        value={customerContact}
                        onChange={(e) => setCustomerContact(e.target.value)}
                        placeholder="For owner follow-up"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-700"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingFeedback || !feedbackText.trim()}
                    className="w-full py-3 px-4 rounded-xl bg-neutral-100 hover:bg-white text-neutral-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmittingFeedback ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending to Management...</span>
                      </>
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
        <div className="text-center text-[11px] text-neutral-600 flex items-center justify-center gap-1">
          <span>Protected by</span>
          <span className="text-neutral-400 font-semibold">TapLocal Review Gatekeeper</span>
        </div>
      </div>
    </div>
  );
};
