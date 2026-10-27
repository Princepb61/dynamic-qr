import React, { useState, useEffect } from 'react';
import { X, Star, MessageSquare, Sparkles, Send, Check, Copy, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ReviewFeedbackRecord } from '../types';

interface CustomerFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: 'admin' | 'client';
}

export const CustomerFeedbackModal: React.FC<CustomerFeedbackModalProps> = ({
  isOpen,
  onClose,
  userRole,
}) => {
  const [feedbacks, setFeedbacks] = useState<ReviewFeedbackRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<ReviewFeedbackRecord | null>(null);
  const [draftReply, setDraftReply] = useState('');
  const [isDraftingAI, setIsDraftingAI] = useState(false);
  const [isSavingReply, setIsSavingReply] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [replyTone, setReplyTone] = useState<'compassionate' | 'professional' | 'generous'>('compassionate');

  const fetchFeedbacks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/feedback/list');
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data.feedbacks || []);
      }
    } catch (err) {
      console.error('Failed to load feedback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFeedbacks();
    }
  }, [isOpen]);

  const handleGenerateAIReply = async (feedback: ReviewFeedbackRecord) => {
    setIsDraftingAI(true);
    try {
      const res = await fetch('/api/ai/draft-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerFeedback: feedback.feedbackText,
          customerName: feedback.customerName || 'Valued Guest',
          rating: feedback.rating,
          tone: replyTone,
        }),
      });

      if (!res.ok) throw new Error('Failed to draft AI response');
      const data = await res.json();
      setDraftReply(data.reply || '');
    } catch (err) {
      console.error('AI draft reply error:', err);
      // Fallback response
      setDraftReply(
        `Dear ${feedback.customerName || 'Guest'},\n\nThank you for bringing this to our attention. I am sincerely sorry that your recent visit fell short of the high standards we strive to uphold. We take your feedback seriously and would love the chance to make this right. Please contact me directly so we can ensure your next experience is exceptional.\n\nWarm regards,\nManagement Team`
      );
    } finally {
      setIsDraftingAI(false);
    }
  };

  const handleSaveReply = async () => {
    if (!selectedFeedback || !draftReply.trim()) return;

    setIsSavingReply(true);
    try {
      const res = await fetch('/api/feedback/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedFeedback.id,
          ownerReply: draftReply.trim(),
          status: 'resolved',
        }),
      });

      if (res.ok) {
        setFeedbacks((prev) =>
          prev.map((f) =>
            f.id === selectedFeedback.id
              ? { ...f, ownerReply: draftReply.trim(), status: 'resolved', ownerRepliedAt: new Date().toISOString() }
              : f
          )
        );
        setSelectedFeedback((prev) =>
          prev ? { ...prev, ownerReply: draftReply.trim(), status: 'resolved' } : null
        );
      }
    } catch (err) {
      console.error('Save reply error:', err);
    } finally {
      setIsSavingReply(false);
    }
  };

  const handleCopyReply = async () => {
    if (!draftReply) return;
    try {
      await navigator.clipboard.writeText(draftReply);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Private Feedback Inbox</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {feedbacks.filter((f) => f.status === 'new').length} New Intercepts
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                1-3 star ratings intercepted before reaching Google Reviews, protected privately.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-neutral-800">
          {/* Feedback List (Left Column) */}
          <div className="md:col-span-5 overflow-y-auto p-4 space-y-3 max-h-[40vh] md:max-h-none">
            {isLoading ? (
              <div className="py-12 text-center text-neutral-500 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Loading customer submissions...</span>
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-white">All Clear! No Negative Feedback</h4>
                <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                  Customer ratings are either 4-5 stars flowing directly to Google, or no complaints have been lodged.
                </p>
              </div>
            ) : (
              feedbacks.map((item) => {
                const isSelected = selectedFeedback?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedFeedback(item);
                      setDraftReply(item.ownerReply || '');
                    }}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                        : 'bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= item.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-700'
                            }`}
                          />
                        ))}
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          item.status === 'resolved'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {item.status === 'resolved' ? 'Resolved' : 'Needs Response'}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-300 line-clamp-2 font-medium mb-2">
                      "{item.feedbackText}"
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span>{item.customerName || 'Anonymous'}</span>
                      <span>/r/{item.slug}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Feedback Detail & AI Reply Studio (Right Column) */}
          <div className="md:col-span-7 overflow-y-auto p-5 space-y-5 bg-neutral-950/40">
            {selectedFeedback ? (
              <div className="space-y-5">
                {/* Detail Summary Card */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-amber-400">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${
                              s <= selectedFeedback.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-neutral-700'
                            }`}
                          />
                        ))}
                        <span className="text-xs font-bold text-white ml-1">
                          {selectedFeedback.rating} Star Intercept
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-400">
                        Received on {new Date(selectedFeedback.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-300 border border-neutral-700">
                      /r/{selectedFeedback.slug}
                    </span>
                  </div>

                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs text-neutral-200 leading-relaxed italic">
                    "{selectedFeedback.feedbackText}"
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-neutral-800/40 border border-neutral-800">
                      <span className="text-[10px] text-neutral-500 block">Customer Name</span>
                      <span className="font-medium text-neutral-200">
                        {selectedFeedback.customerName || 'Not provided'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-neutral-800/40 border border-neutral-800">
                      <span className="text-[10px] text-neutral-500 block">Contact Info</span>
                      <span className="font-medium text-neutral-200">
                        {selectedFeedback.customerContact || 'None left'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Reply Assistant Card */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Gemini AI Owner Reply Assistant</span>
                    </div>
                    <div className="flex gap-1">
                      {(['compassionate', 'professional', 'generous'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setReplyTone(t)}
                          className={`text-[10px] px-2 py-0.5 rounded font-medium capitalize border ${
                            replyTone === t
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'text-neutral-500 border-transparent hover:text-neutral-300'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400">
                    Draft a high-EQ, de-escalating owner response that turns an unhappy guest into a loyal advocate.
                  </p>

                  <button
                    type="button"
                    onClick={() => handleGenerateAIReply(selectedFeedback)}
                    disabled={isDraftingAI}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-neutral-950 font-bold text-xs shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isDraftingAI ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Crafting thoughtful response with Gemini 3.8 Flash...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Draft High-EQ Owner Reply with AI</span>
                      </>
                    )}
                  </button>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-neutral-400 flex items-center justify-between">
                      <span>Response Message</span>
                      {selectedFeedback.ownerReply && (
                        <span className="text-emerald-400 text-[10px]">Saved to Record</span>
                      )}
                    </label>
                    <textarea
                      rows={5}
                      value={draftReply}
                      onChange={(e) => setDraftReply(e.target.value)}
                      placeholder="AI drafted response will appear here. You can edit before saving or copying..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCopyReply}
                      disabled={!draftReply}
                      className="flex-1 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {copySuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Copy Reply</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveReply}
                      disabled={isSavingReply || !draftReply}
                      className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {isSavingReply ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Save & Mark Resolved</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center text-neutral-500 text-xs">
                Select a feedback message on the left to inspect details and generate an AI owner reply.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
