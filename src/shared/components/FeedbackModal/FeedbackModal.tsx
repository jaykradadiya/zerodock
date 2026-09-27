import { useState, useEffect, useRef, useMemo, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  MessageSquarePlus,
  Lightbulb,
  Wrench,
  Bug,
  MessageCircle,
  Star,
  Check,
  AlertCircle,
  Loader2,
  Copy,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';
import { useUIStore } from '../../../core/store/useUIStore';
import { toolRegistry } from '../../../core/registry/tools';
import { useLocation } from '@tanstack/react-router';
import {
  submitFeedback,
  formatFeedbackAsMarkdown,
  getTechnicalMetadata,
} from '../../services/feedbackService';
import type { FeedbackCategory, FeedbackPayload } from '../../types/feedback';
import { Button } from '../ui/Button';
import { trackEvent } from '../../../core/analytics';

const CATEGORIES: Array<{
  id: FeedbackCategory;
  label: string;
  icon: typeof Lightbulb;
  titlePlaceholder: string;
  descPlaceholder: string;
}> = [
  {
    id: 'feature',
    label: 'Feature Request',
    icon: Lightbulb,
    titlePlaceholder: 'e.g., Add JSON Schema Draft 2020-12 validation',
    descPlaceholder: 'What feature would you like to see? How would it improve your development workflow?',
  },
  {
    id: 'tool-request',
    label: 'New Tool Idea',
    icon: Wrench,
    titlePlaceholder: 'e.g., Protobuf to JSON Inspector, Crontab Calculator',
    descPlaceholder: 'What new developer tool would you like in ZeroDock? Describe inputs and expected output.',
  },
  {
    id: 'bug',
    label: 'Bug Report',
    icon: Bug,
    titlePlaceholder: 'e.g., Tree view freezes when expanding deeply nested arrays',
    descPlaceholder: 'What happened? Please share steps to reproduce or expected vs actual behavior.',
  },
  {
    id: 'general',
    label: 'General Feedback',
    icon: MessageCircle,
    titlePlaceholder: 'e.g., Fast performance and love the keyboard shortcuts',
    descPlaceholder: 'Share your thoughts, suggestions, or ideas for improving ZeroDock.',
  },
];

export function FeedbackModal() {
  const { feedbackModalOpen, setFeedbackModalOpen, feedbackModalCategory } = useUIStore();
  const location = useLocation();

  const [category, setCategory] = useState<FeedbackCategory>(() => feedbackModalCategory || 'feature');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [showMetadataDetails, setShowMetadataDetails] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Detect current active tool
  const currentPath = location.pathname;
  const activeTool = useMemo(
    () => toolRegistry.find((t) => t.route === currentPath || (t.route !== '/' && currentPath.startsWith(t.route))),
    [currentPath]
  );

  const technicalMetadata = useMemo(
    () => getTechnicalMetadata(activeTool?.name),
    [activeTool]
  );

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => titleInputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  // Handle Escape key
  useEffect(() => {
    if (!feedbackModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        setFeedbackModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [feedbackModalOpen, isSubmitting, setFeedbackModalOpen]);

  const activeCategoryMeta = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];

  const handleClose = () => {
    if (isSubmitting) return;
    setFeedbackModalOpen(false);
  };

  const handleResetForm = () => {
    setTitle('');
    setDescription('');
    setEmail('');
    setRating(0);
    setIsSuccess(false);
    setErrorMessage(null);
  };

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || !description.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload: FeedbackPayload = {
      category,
      title: title.trim(),
      description: description.trim(),
      email: email.trim() || undefined,
      rating: rating > 0 ? rating : undefined,
      metadata: includeMetadata ? technicalMetadata : undefined,
      timestamp: new Date().toISOString(),
    };

    try {
      await submitFeedback(payload);
      setIsSuccess(true);
      trackEvent('feedback', 'submitted', category);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit feedback. Please try again.';
      setErrorMessage(msg);
      trackEvent('feedback', 'submission_failed', category);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyMarkdown = async () => {
    const payload: FeedbackPayload = {
      category,
      title: title.trim() || 'Feedback',
      description: description.trim() || 'No description provided',
      email: email.trim() || undefined,
      rating: rating > 0 ? rating : undefined,
      metadata: includeMetadata ? technicalMetadata : undefined,
      timestamp: new Date().toISOString(),
    };

    const md = formatFeedbackAsMarkdown(payload);
    try {
      await navigator.clipboard.writeText(md);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2500);
      trackEvent('feedback', 'copied_markdown', category);
    } catch {
      // Fallback
    }
  };

  if (!feedbackModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={handleClose}
        className="fixed inset-0 bg-black/65 backdrop-blur-sm"
      />

      {/* Modal Dialog Card */}
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl border border-[var(--zd-border)] bg-[var(--zd-bg)] shadow-[0_24px_64px_rgba(0,0,0,0.55)] z-10 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--zd-border)] bg-[var(--zd-surface)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] flex items-center justify-center shadow-xs">
              <MessageSquarePlus className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="feedback-modal-title"
                className="text-sm sm:text-base font-bold text-[var(--zd-text-primary)]"
              >
                Feature Requests & Feedback
              </h2>
              <p className="text-xs text-[var(--zd-text-muted)]">
                Help shape the future of ZeroDock with direct feedback
              </p>
            </div>
          </div>

          <Button
            variant="icon"
            size="sm"
            onClick={handleClose}
            aria-label="Close modal"
            className="!w-8 !h-8 !rounded-xl text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)]"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar min-h-0">
          {isSuccess ? (
            <div className="py-8 px-4 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--zd-success)]/15 text-[var(--zd-success)] border border-[var(--zd-success)]/30 flex items-center justify-center mb-4 shadow-sm">
                <Check className="w-7 h-7" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--zd-text-primary)] mb-1.5">
                Thank You for Your Feedback!
              </h3>
              <p className="text-xs sm:text-sm text-[var(--zd-text-secondary)] max-w-md mb-6 leading-relaxed">
                Your submission has been sent directly to the development team. We review every feature request and bug report to improve ZeroDock.
              </p>

              <div className="flex items-center gap-3">
                <Button variant="secondary" onClick={handleResetForm} size="sm">
                  Send Another
                </Button>
                <Button variant="primary" onClick={handleClose} size="sm">
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Category Selector Tabs */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--zd-text-secondary)] uppercase tracking-wider">
                  Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--zd-primary-soft)] border-[var(--zd-primary)] text-[var(--zd-primary)] shadow-xs'
                            : 'bg-[var(--zd-surface)] border-[var(--zd-border)] text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] hover:border-[var(--zd-border-hover)]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="feedback-title"
                    className="text-xs font-semibold text-[var(--zd-text-secondary)] uppercase tracking-wider"
                  >
                    Title <span className="text-[var(--zd-danger)]">*</span>
                  </label>
                  <span className="text-[10px] text-[var(--zd-text-muted)] font-mono">
                    {title.length}/100
                  </span>
                </div>
                <input
                  id="feedback-title"
                  ref={titleInputRef}
                  type="text"
                  maxLength={100}
                  required
                  placeholder={activeCategoryMeta.titlePlaceholder}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-xl px-3 py-2 text-xs sm:text-sm text-[var(--zd-text-primary)] placeholder-[var(--zd-text-muted)] outline-none focus:border-[var(--zd-primary)] focus:ring-1 focus:ring-[var(--zd-primary)] transition-all font-sans"
                />
              </div>

              {/* Description Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="feedback-description"
                    className="text-xs font-semibold text-[var(--zd-text-secondary)] uppercase tracking-wider"
                  >
                    Details <span className="text-[var(--zd-danger)]">*</span>
                  </label>
                  <span className="text-[10px] text-[var(--zd-text-muted)] font-mono">
                    {description.length}/2000
                  </span>
                </div>
                <textarea
                  id="feedback-description"
                  required
                  rows={4}
                  maxLength={2000}
                  placeholder={activeCategoryMeta.descPlaceholder}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-xl p-3 text-xs sm:text-sm text-[var(--zd-text-primary)] placeholder-[var(--zd-text-muted)] outline-none focus:border-[var(--zd-primary)] focus:ring-1 focus:ring-[var(--zd-primary)] transition-all font-sans resize-none"
                />
              </div>

              {/* Star Rating & Email Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Rating */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--zd-text-secondary)] uppercase tracking-wider">
                    Experience Rating
                  </label>
                  <div className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[var(--zd-surface)] border border-[var(--zd-border)]">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star === rating ? 0 : star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`Rate ${star} out of 5 stars`}
                        className="p-1 rounded text-[var(--zd-text-muted)] hover:scale-115 transition-transform cursor-pointer"
                      >
                        <Star
                          size={15}
                          className={
                            (hoverRating || rating) >= star
                              ? 'text-[var(--zd-accent)] fill-[var(--zd-accent)]'
                              : 'text-[var(--zd-text-muted)]'
                          }
                        />
                      </button>
                    ))}
                    {rating > 0 && (
                      <span className="text-xs font-mono font-medium text-[var(--zd-text-secondary)] ml-auto">
                        {rating}/5
                      </span>
                    )}
                  </div>
                </div>

                {/* Email (Optional) */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="feedback-email"
                    className="text-xs font-semibold text-[var(--zd-text-secondary)] uppercase tracking-wider"
                  >
                    Email <span className="text-[var(--zd-text-muted)] font-normal text-[10px]">(Optional)</span>
                  </label>
                  <input
                    id="feedback-email"
                    type="email"
                    placeholder="For follow-up questions"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-xl px-3 py-2 text-xs sm:text-sm text-[var(--zd-text-primary)] placeholder-[var(--zd-text-muted)] outline-none focus:border-[var(--zd-primary)] focus:ring-1 focus:ring-[var(--zd-primary)] transition-all font-sans h-9"
                  />
                </div>
              </div>

              {/* Technical Diagnostics & Privacy Section */}
              <div className="rounded-xl border border-[var(--zd-border)] bg-[var(--zd-surface)] p-3 text-xs flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeMetadata}
                      onChange={(e) => setIncludeMetadata(e.target.checked)}
                      className="rounded border-[var(--zd-border)] text-[var(--zd-primary)] focus:ring-0 cursor-pointer"
                    />
                    <span className="font-semibold text-[var(--zd-text-primary)]">
                      Include diagnostic metadata
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowMetadataDetails(!showMetadataDetails)}
                    className="flex items-center gap-1 text-[11px] text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] cursor-pointer"
                  >
                    <span>{showMetadataDetails ? 'Hide details' : 'View payload'}</span>
                    {showMetadataDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>

                {/* Diagnostic Details Accordion */}
                {showMetadataDetails && (
                  <div className="pt-2 border-t border-[var(--zd-border)] font-mono text-[11px] text-[var(--zd-text-secondary)] grid grid-cols-2 gap-1.5">
                    <div>Tool: <span className="text-[var(--zd-text-primary)]">{technicalMetadata.tool || 'None'}</span></div>
                    <div>Route: <span className="text-[var(--zd-text-primary)]">{technicalMetadata.path}</span></div>
                    <div>Screen: <span className="text-[var(--zd-text-primary)]">{technicalMetadata.screenSize}</span></div>
                    <div>Theme: <span className="text-[var(--zd-text-primary)]">{technicalMetadata.theme}</span></div>
                    <div className="col-span-2 truncate">Browser: <span className="text-[var(--zd-text-primary)]">{technicalMetadata.userAgent}</span></div>
                  </div>
                )}

                {/* Privacy Guarantee Disclosure */}
                <div className="flex items-start gap-1.5 text-[11px] text-[var(--zd-text-muted)] pt-1 border-t border-[var(--zd-border)]/60">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--zd-success)] shrink-0 mt-0.5" />
                  <span>
                    ZeroDock is 100% client-side. Your code, JSON files, keys, and tokens are <strong>never</strong> transmitted.
                  </span>
                </div>
              </div>

              {/* Error Message with Fallback */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-[var(--zd-danger)]/10 border border-[var(--zd-danger)]/30 text-xs text-[var(--zd-danger)] flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                  <div className="flex items-center gap-2 pl-6">
                    <button
                      type="button"
                      onClick={handleCopyMarkdown}
                      className="underline hover:no-underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Copy size={12} />
                      <span>{copiedMarkdown ? 'Copied to clipboard!' : 'Copy feedback as Markdown'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyMarkdown}
                  title="Copy as Markdown"
                  className="gap-1.5 text-xs"
                >
                  {copiedMarkdown ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[var(--zd-success)]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Markdown</span>
                    </>
                  )}
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSubmitting || !title.trim() || !description.trim()}
                    className="gap-1.5 font-bold"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <MessageSquarePlus className="w-3.5 h-3.5" />
                        <span>Submit Feedback</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
