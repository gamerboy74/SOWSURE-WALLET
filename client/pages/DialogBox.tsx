import React from "react";
import { X, Loader2 } from "lucide-react";

interface DialogBoxProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  loading?: boolean;
  contentClassName:string;
}

const DialogBox: React.FC<DialogBoxProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  loading = false,
  contentClassName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="modal-content bg-white rounded-xl shadow-xl w-full max-w-md relative transform transition-all scale-100 opacity-100">
        <div className="sticky top-0 bg-white p-4 border-b border-gray-100 z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
              disabled={loading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="p-4">{children}</div>
        {footer && (
          <div className="p-4 border-t border-gray-100 flex justify-end space-x-2">
            {footer}
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        )}
      </div>
    </div>
  );
};

export default DialogBox;