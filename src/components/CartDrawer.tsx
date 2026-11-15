import React, { useState } from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X, Check } from 'lucide-react';
import { BALL_EDITIONS, type BallEdition, type FinishId } from '../data/editions';

export interface CartItem {
  edition: BallEdition;
  quantity: number;
}

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQty: (id: FinishId, delta: number) => void;
  onRemove: (id: FinishId) => void;
  onAddEdition: (edition: BallEdition) => void;
  onClearCart: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  onClose,
  items,
  onUpdateQty,
  onRemove,
  onAddEdition,
  onClearCart,
}) => {
  const [checkedOut, setCheckedOut] = useState(false);

  if (!open) return null;

  const subtotal = items.reduce(
    (sum, item) => sum + item.edition.priceNum * item.quantity,
    0
  );

  const handleCheckout = () => {
    setCheckedOut(true);
    setTimeout(() => {
      onClearCart();
      setCheckedOut(false);
      onClose();
    }, 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/75"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag"
    >
      <div
        className="w-full max-w-[420px] h-full bg-[#060608] border-l border-white/10 flex flex-col justify-between p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div className="flex items-center justify-between pb-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-4 h-4 text-[#F13507]" strokeWidth={1.5} />
              <h2 className="font-condensed text-xl uppercase tracking-[0.1em] text-white">
                Equipment Bag
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors duration-200 cursor-pointer"
              aria-label="Close bag"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>

          {checkedOut ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-[#F13507] mx-auto flex items-center justify-center mb-4">
                <Check className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <p className="font-condensed text-2xl uppercase tracking-wider text-white">
                Order Dispatched
              </p>
              <p className="mt-2 text-xs text-[#71717A] max-w-[260px] mx-auto leading-relaxed">
                Your Obsidian Court edition is reserved and queued for precision pressure calibration.
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-10">
              <p className="text-xs text-[#71717A] mb-6">
                Your bag is empty. Select a pro-calibrated basketball edition below.
              </p>
              <div className="space-y-3">
                {BALL_EDITIONS.map((ed) => (
                  <div
                    key={ed.id}
                    className="flex items-center justify-between p-4 border border-white/10 bg-[#0A0A0C]"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: ed.swatchHex }}
                      />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white">
                          {ed.name}
                        </p>
                        <p className="text-[11px] font-mono-tabular text-[#71717A]">
                          {ed.price}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAddEdition(ed)}
                      className="px-3.5 py-2 bg-[#F13507] hover:bg-[#ff471a] text-white text-[10px] font-semibold uppercase tracking-[0.16em] rounded-[4px] transition-colors duration-200 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-6 space-y-4 max-h-[55vh] overflow-y-auto no-scrollbar">
              {items.map(({ edition, quantity }) => (
                <div
                  key={edition.id}
                  className="flex items-center justify-between gap-4 pb-4 border-b border-white/10"
                >
                  <div className="flex items-center gap-3.5">
                    <span
                      className="w-9 h-9 rounded-full border border-white/20 shrink-0"
                      style={{
                        background: `radial-gradient(circle at 35% 30%, ${edition.leatherHighlightHex}, ${edition.leatherBaseHex})`,
                      }}
                    />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white">
                        {edition.name}
                      </p>
                      <p className="text-[10px] font-mono-tabular text-[#71717A] mt-0.5">
                        {edition.sizeSpec}
                      </p>
                      <p className="text-xs font-mono-tabular text-[#F13507] mt-1">
                        ${(edition.priceNum * quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(edition.id, -1)}
                      className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" strokeWidth={1.5} />
                    </button>
                    <span className="w-5 text-center text-xs font-mono-tabular text-white">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQty(edition.id, 1)}
                      className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3" strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(edition.id)}
                      className="ml-1 text-[#71717A] hover:text-white transition-colors cursor-pointer"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && !checkedOut && (
          <div className="pt-5 border-t border-white/10">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[10px] uppercase tracking-[0.22em] text-[#A1A1AA]">
                Subtotal
              </span>
              <span className="text-2xl font-light font-mono-tabular text-white">
                ${subtotal.toFixed(2)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCheckout}
              className="w-full bg-[#F13507] hover:bg-[#ff471a] text-white rounded-[4px] py-4 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors duration-200 cursor-pointer"
            >
              Complete Order
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
