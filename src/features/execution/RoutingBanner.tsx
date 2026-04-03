import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ShieldCheck, ExternalLink } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface RoutingBannerProps {
  isProcessing: boolean;
}

const RoutingBanner: React.FC<RoutingBannerProps> = ({ isProcessing }) => {
  const { matchedSkillId, setSelectedSkillId, setSkillLibraryOpen } = useStore();

  const handleViewDefinition = () => {
    if (matchedSkillId) {
      setSelectedSkillId(matchedSkillId);
      setSkillLibraryOpen(true);
    }
  };

  const showBanner = isProcessing || matchedSkillId;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden bg-slate-50 border-bottom border-slate-200"
        >
          <div className="px-6 py-2 flex items-center justify-between min-h-[40px]">
            <div className="flex items-center gap-3">
              {isProcessing && !matchedSkillId ? (
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    background: '#eff6ff', 
                    border: '1px solid #dbeafe', 
                    borderRadius: '9999px', 
                    padding: '0.25rem 0.75rem',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}
                >
                  <Loader2 size={12} className="animate-spin" style={{ color: '#3b82f6' }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#1e40af', letterSpacing: '0.01em' }}>
                    System Agent is analyzing natural language to map to a 6G Skill...
                  </span>
                </div>
              ) : matchedSkillId ? (
                <>
                  <div className="flex items-center gap-1.5 text-emerald-600">
                    <ShieldCheck size={14} />
                    <span className="text-[11px] font-bold uppercase tracking-tight">System Agent Match Decision:</span>
                  </div>
                  <div className="px-2 py-0.5 bg-emerald-100 border border-emerald-200 text-emerald-700 rounded text-[10px] font-mono font-bold">
                    {matchedSkillId}
                  </div>
                </>
              ) : null}
            </div>

            {matchedSkillId && (
              <button
                onClick={handleViewDefinition}
                className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors group"
              >
                View Skill Definition
                <ExternalLink size={10} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RoutingBanner;
