import React, { useState, useEffect } from 'react';
import { LinkRecord, DynamicButtonConfig } from '../types';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  ArrowRight,
  ShoppingBag,
  MessageCircle,
  Calendar,
  Phone,
  Zap,
  Layers,
  Code2,
  CheckCircle2,
  Palette,
  Laptop,
  Smartphone,
} from 'lucide-react';

interface DynamicButtonModalProps {
  link: LinkRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    id: string,
    updates: {
      dynamicButton: DynamicButtonConfig;
      presentationMode: 'instant_redirect' | 'button_page';
    }
  ) => Promise<void>;
}

export const DynamicButtonModal: React.FC<DynamicButtonModalProps> = ({
  link,
  isOpen,
  onClose,
  onSave,
}) => {
  const [text, setText] = useState('Order Online Now');
  const [subtitle, setSubtitle] = useState('Tap to unlock specials & deals');
  const [theme, setTheme] = useState<'indigo' | 'emerald' | 'amber' | 'dark' | 'neon' | 'glass'>('indigo');
  const [shape, setShape] = useState<'pill' | 'rounded' | 'sharp'>('pill');
  const [animation, setAnimation] = useState<'pulse' | 'glow' | 'float' | 'none'>('pulse');
  const [icon, setIcon] = useState<'arrow' | 'cart' | 'sparkles' | 'chat' | 'calendar' | 'external' | 'phone' | 'zap'>('arrow');
  const [presentationMode, setPresentationMode] = useState<'instant_redirect' | 'button_page'>('button_page');
  const [buttonSize, setButtonSize] = useState<'md' | 'lg' | 'xl'>('lg');

  const [copiedCodeTab, setCopiedCodeTab] = useState<'html' | 'react' | 'markdown' | 'url' | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'html' | 'react' | 'markdown'>('html');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (link) {
      if (link.dynamicButton) {
        setText(link.dynamicButton.text || 'Order Online Now');
        setSubtitle(link.dynamicButton.subtitle || '');
        setTheme(link.dynamicButton.theme || 'indigo');
        setShape(link.dynamicButton.shape || 'pill');
        setAnimation(link.dynamicButton.animation || 'pulse');
        setIcon(link.dynamicButton.icon || 'arrow');
      } else {
        setText(link.title ? `Explore: ${link.title}` : 'Tap to Open');
        setSubtitle('Always up to date via taplocalin');
        setTheme('indigo');
        setShape('pill');
        setAnimation('pulse');
        setIcon('arrow');
      }
      setPresentationMode(link.presentationMode === 'instant_redirect' ? 'instant_redirect' : 'button_page');
    }
  }, [link]);

  if (!isOpen || !link) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const redirectUrl = `${baseUrl}/r/${link.slug}`;

  // Theme gradient / colors
  const getThemeClasses = () => {
    switch (theme) {
      case 'emerald':
        return 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25';
      case 'amber':
        return 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25';
      case 'dark':
        return 'bg-neutral-900 text-white border border-neutral-700 shadow-md';
      case 'neon':
        return 'bg-cyan-400 text-neutral-950 font-black shadow-lg shadow-cyan-400/30';
      case 'glass':
        return 'bg-neutral-800/80 text-white border border-neutral-700 backdrop-blur-md shadow-lg';
      case 'indigo':
      default:
        return 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white shadow-lg shadow-indigo-500/30';
    }
  };

  const getShapeClasses = () => {
    switch (shape) {
      case 'pill':
        return 'rounded-full';
      case 'sharp':
        return 'rounded-md';
      case 'rounded':
      default:
        return 'rounded-xl';
    }
  };

  const getSizeClasses = () => {
    switch (buttonSize) {
      case 'md':
        return 'py-2.5 px-5 text-xs';
      case 'xl':
        return 'py-4 px-8 text-base';
      case 'lg':
      default:
        return 'py-3.5 px-6 text-sm';
    }
  };

  const renderIcon = (className = 'w-4 h-4') => {
    switch (icon) {
      case 'cart':
        return <ShoppingBag className={className} />;
      case 'sparkles':
        return <Sparkles className={className} />;
      case 'chat':
        return <MessageCircle className={className} />;
      case 'calendar':
        return <Calendar className={className} />;
      case 'phone':
        return <Phone className={className} />;
      case 'zap':
        return <Zap className={className} />;
      case 'external':
        return <ExternalLink className={className} />;
      case 'arrow':
      default:
        return <ArrowRight className={className} />;
    }
  };

  // Generated Embed Codes
  const htmlSnippet = `<!-- taplocalin Dynamic Button -->
<a href="${redirectUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;flex-direction:column;align-items:center;justify-content:center;padding:14px 28px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:${shape === 'pill' ? '9999px' : shape === 'sharp' ? '6px' : '14px'};font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;box-shadow:0 10px 15px -3px rgba(79,70,229,0.3);text-align:center;">
  <span style="font-size:15px;display:inline-flex;align-items:center;gap:8px;">${text} &#8594;</span>
  ${subtitle ? `<span style="font-size:11px;opacity:0.85;margin-top:2px;">${subtitle}</span>` : ''}
</a>`;

  const reactSnippet = `// React / Tailwind Dynamic Button
<a
  href="${redirectUrl}"
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex flex-col items-center justify-center ${getSizeClasses()} ${getThemeClasses()} ${getShapeClasses()} font-bold transition-all hover:opacity-95 active:scale-95"
>
  <span className="flex items-center gap-2">
    <span>${text}</span>
    <span>&rarr;</span>
  </span>
  ${subtitle ? `<span className="text-xs opacity-85 font-normal">${subtitle}</span>` : ''}
</a>`;

  const markdownSnippet = `[![${text}](${baseUrl}/api/button-badge/${link.slug})](${redirectUrl})`;

  const copyToClipboard = (content: string, type: 'html' | 'react' | 'markdown' | 'url') => {
    navigator.clipboard.writeText(content);
    setCopiedCodeTab(type);
    setTimeout(() => setCopiedCodeTab(null), 2200);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(link.id, {
        dynamicButton: {
          enabled: true,
          text: text.trim() || 'Continue',
          subtitle: subtitle.trim(),
          theme,
          shape,
          animation,
          icon,
          showQRBadge: true,
        },
        presentationMode,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-4xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">Dynamic Button Studio</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono truncate max-w-[220px] sm:max-w-md">
                Dynamic route: /r/{link.slug} &bull; Destination can be changed anytime
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left Column: Live Interactive Preview & Embed Codes (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  Live Interactive Button Preview
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">
                  Click to test redirect
                </span>
              </div>

              {/* Preview Canvas */}
              <div className="p-8 rounded-2xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden min-h-[220px]">
                {/* Subtle backdrop glow */}
                <div className="absolute inset-0 bg-radial from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

                <div className="w-full max-w-sm space-y-4 relative z-10">
                  <div className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">
                    taplocalin dynamic action
                  </div>

                  {/* The Dynamic Button */}
                  <a
                    href={redirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group w-full inline-flex flex-col items-center justify-center ${getSizeClasses()} ${getThemeClasses()} ${getShapeClasses()} font-extrabold transition-all duration-200 transform hover:scale-[1.02] active:scale-98`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span>{text || 'Dynamic Button'}</span>
                      {renderIcon('w-4 h-4 transition-transform group-hover:translate-x-1')}
                    </span>
                    {subtitle && (
                      <span className="text-[11px] opacity-85 font-medium mt-0.5">
                        {subtitle}
                      </span>
                    )}
                  </a>

                  <div className="text-[11px] text-neutral-500 font-mono flex items-center justify-center gap-1.5 pt-1">
                    <span>Target:</span>
                    <span className="text-neutral-400 truncate max-w-[200px]" title={link.destinationUrl}>
                      {link.destinationUrl}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Presentation Mode Selector */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl space-y-2">
              <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                How should visitors experience /r/{link.slug}?
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPresentationMode('button_page')}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    presentationMode === 'button_page'
                      ? 'bg-white dark:bg-neutral-800 border-neutral-900 dark:border-white shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-white dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-neutral-900 dark:text-white">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Dynamic Button Page</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">
                    Displays modern tap card with this dynamic action button.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPresentationMode('instant_redirect')}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    presentationMode === 'instant_redirect'
                      ? 'bg-white dark:bg-neutral-800 border-neutral-900 dark:border-white shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-white dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-neutral-900 dark:text-white">
                    <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Instant 307 Redirect</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">
                    Jumps immediately to destination URL. (Embed code still works).
                  </p>
                </button>
              </div>
            </div>

            {/* 1-Click Embed Snippet Generator */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Embed Code (Place on Any Site or Email)
                </span>
                <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg text-xs font-medium">
                  <button
                    onClick={() => setActiveCodeTab('html')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      activeCodeTab === 'html' ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs' : 'text-neutral-500 dark:text-neutral-400'
                    }`}
                  >
                    HTML
                  </button>
                  <button
                    onClick={() => setActiveCodeTab('react')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      activeCodeTab === 'react' ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs' : 'text-neutral-500 dark:text-neutral-400'
                    }`}
                  >
                    React
                  </button>
                  <button
                    onClick={() => setActiveCodeTab('markdown')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      activeCodeTab === 'markdown' ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs' : 'text-neutral-500 dark:text-neutral-400'
                    }`}
                  >
                    Markdown
                  </button>
                </div>
              </div>

              <div className="relative">
                <pre className="p-3.5 bg-neutral-900 text-neutral-300 font-mono text-[11px] rounded-xl overflow-x-auto max-h-36 border border-neutral-800 leading-relaxed">
                  {activeCodeTab === 'html'
                    ? htmlSnippet
                    : activeCodeTab === 'react'
                    ? reactSnippet
                    : markdownSnippet}
                </pre>
                <button
                  onClick={() =>
                    copyToClipboard(
                      activeCodeTab === 'html'
                        ? htmlSnippet
                        : activeCodeTab === 'react'
                        ? reactSnippet
                        : markdownSnippet,
                      activeCodeTab
                    )
                  }
                  className="absolute top-2.5 right-2.5 px-2.5 py-1 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-md border border-white/10 flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  {copiedCodeTab === activeCodeTab ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Customization Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Button Text */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Button Label / Call to Action <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. Order Online, Book Now, Join VIP"
                className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-400"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Button Tagline / Subtitle (Optional)
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Instant Delivery · 20% Off"
                className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-400"
              />
            </div>

            {/* Theme Selector */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Color Theme
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'indigo', label: 'Electric Indigo', preview: 'bg-indigo-600' },
                  { id: 'emerald', label: 'Emerald Mint', preview: 'bg-emerald-600' },
                  { id: 'amber', label: 'Sunset Coral', preview: 'bg-amber-500' },
                  { id: 'dark', label: 'Obsidian Dark', preview: 'bg-neutral-900' },
                  { id: 'neon', label: 'Cyber Neon', preview: 'bg-cyan-400' },
                  { id: 'glass', label: 'Glass Frost', preview: 'bg-neutral-500' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTheme(item.id as any)}
                    className={`p-2 rounded-lg border text-left transition-colors flex items-center gap-2 ${
                      theme === item.id
                        ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800 ring-1 ring-neutral-900 dark:ring-white'
                        : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${item.preview} shrink-0`} />
                    <span className="text-[11px] font-medium text-neutral-800 dark:text-neutral-200 truncate">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Shape */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Button Shape
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'pill', label: 'Pill Curve' },
                  { id: 'rounded', label: 'Rounded 12px' },
                  { id: 'sharp', label: 'Modern Sharp' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setShape(item.id as any)}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-colors ${
                      shape === item.id
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Button Icon
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'arrow', label: 'Arrow' },
                  { id: 'cart', label: 'Shop' },
                  { id: 'sparkles', label: 'Spark' },
                  { id: 'chat', label: 'Chat' },
                  { id: 'calendar', label: 'Book' },
                  { id: 'phone', label: 'Phone' },
                  { id: 'zap', label: 'Zap' },
                  { id: 'external', label: 'Link' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIcon(item.id as any)}
                    className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-colors flex items-center justify-center gap-1 ${
                      icon === item.id
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <span className="text-[11px] capitalize">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Apply & Save Dynamic Button'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
