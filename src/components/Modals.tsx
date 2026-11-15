import React, { useState } from 'react';
import { X, Play, Check } from 'lucide-react';
import type { BallEdition } from '../data/editions';

interface PromoModalProps {
  open: boolean;
  onClose: () => void;
  edition: BallEdition;
}

export const PromoModal: React.FC<PromoModalProps> = ({ open, onClose, edition }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Engineering Reel"
    >
      <div
        className="w-full max-w-[640px] bg-[#040508] border border-white/15 rounded-[4px] p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 bg-[#F13507]" />
            <span className="text-[10px] uppercase tracking-[0.26em] text-[#A1A1AA]">
              Engineering Brief · {edition.name}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="py-6 grid md:grid-cols-2 gap-6 items-center">
          <div className="relative aspect-square bg-black border border-white/10 flex flex-col items-center justify-center p-6 overflow-hidden">
            <img
              src="/assets/aistudio/Gemini_Generated_Image_eh4lwzeh4lwzeh4l_f947b215.png"
              alt={edition.name}
              referrerPolicy="no-referrer"
              className="w-44 h-44 object-contain"
            />
            <div className="mt-4 flex items-center gap-2 text-[10px] font-mono-tabular uppercase tracking-[0.2em] text-[#F13507]">
              <Play className="w-3 h-3 fill-[#F13507]" />
              <span>Real-Time WebGL Active</span>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-display text-4xl uppercase leading-[0.88] text-white">
              BUILT FOR THE HARDWOOD<span className="text-[#F13507]">.</span>
            </h3>
            <p className="text-[13px] leading-[1.55] text-[#71717A]">
              Every {edition.name} combines an 8-panel full-grain microfiber shell with 1.2mm vulcanized rubber seam channels and a rotational nylon-wound carcass.
            </p>
            <div className="pt-2 space-y-2 border-t border-white/10 text-[11px] font-mono-tabular text-[#A1A1AA]">
              <div className="flex justify-between">
                <span>PEBBLE RELIEF</span>
                <span className="text-white">0.5 MM</span>
              </div>
              <div className="flex justify-between">
                <span>CHANNEL DEPTH</span>
                <span className="text-white">1.2 MM</span>
              </div>
              <div className="flex justify-between">
                <span>CALIBRATION</span>
                <span className="text-white">8.0 PSI</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ open, onClose }) => {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setEmail('');
      setMessage('');
      onClose();
    }, 1600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Studio Concierge"
    >
      <div
        className="w-full max-w-[460px] bg-[#040508] border border-white/15 rounded-[4px] p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 bg-[#F13507]" />
            <span className="text-[10px] uppercase tracking-[0.26em] text-[#A1A1AA]">
              Concierge & Team Orders
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
            aria-label="Close contact dialog"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {submitted ? (
          <div className="py-12 text-center">
            <div className="w-11 h-11 rounded-full bg-[#F13507] mx-auto flex items-center justify-center mb-4">
              <Check className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <p className="font-condensed text-2xl uppercase tracking-wider text-white">
              Inquiry Received
            </p>
            <p className="mt-2 text-xs text-[#71717A]">
              Our equipment specialist will respond within 24 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.22em] text-[#A1A1AA] mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coach@club.org"
                className="w-full bg-[#0A0A0C] border border-white/15 rounded-[4px] px-4 py-3 text-xs text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#F13507]"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.22em] text-[#A1A1AA] mb-2">
                Specification / Quantity
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Arena team allocation, custom debossing, or press inquiry..."
                className="w-full bg-[#0A0A0C] border border-white/15 rounded-[4px] px-4 py-3 text-xs text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#F13507] resize-none"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#F13507] hover:bg-[#ff471a] text-white rounded-[4px] py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors cursor-pointer"
            >
              Send Inquiry
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
