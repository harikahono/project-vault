"use client"
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-[#0A0A0A] border border-[#1A1A1A] p-6 shadow-[0_0_50px_rgba(0,0,0,1)] overflow-hidden"
          >
            {/* Design Accents Arasaka Style */}
            <div className="absolute top-0 left-0 w-2 h-2 bg-[#00FF9C]" />
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-[#00FF9C]" />
            
            <div className="flex justify-between items-center mb-6 border-b border-[#1A1A1A] pb-4">
              <h2 className="text-xs font-black uppercase tracking-[0.4em] text-[#00FF9C]">
                {title}
              </h2>
              <button 
                title="Abort_Sequence" // FIXED: Menghilangkan error axe
                onClick={onClose}
                className="text-zinc-500 hover:text-[#FF2E63] transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}