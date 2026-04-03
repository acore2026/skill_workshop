import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import './SkillLibraryModal.css';

const SkillLibraryModal: React.FC = () => {
  const { 
    isSkillLibraryOpen, 
    selectedSkillId, 
    setSkillLibraryOpen, 
    setSelectedSkillId,
    skills,
    isLoadingSkills,
    skillsError
  } = useStore();

  // Set initial selection if none
  useEffect(() => {
    if (isSkillLibraryOpen && !selectedSkillId && skills.length > 0) {
      setSelectedSkillId(skills[0].id);
    }
  }, [isSkillLibraryOpen, selectedSkillId, setSelectedSkillId, skills]);

  const selectedSkill = useMemo(() => 
    skills.find(s => s.id === selectedSkillId) || null
  , [skills, selectedSkillId]);

  return (
    <AnimatePresence>
      {isSkillLibraryOpen && (
        <div className="skill-library-overlay">
          {/* Backdrop (Framer handles the dimming) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSkillLibraryOpen(false)}
            style={{ position: 'absolute', inset: 0 }}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="skill-library-modal"
          >
            {/* Header */}
            <div className="skill-library-header">
              <div className="skill-library-header-title">
                <div className="skill-library-icon-container">
                  <BookOpen size={20} />
                </div>
                <div className="skill-library-title-text">
                  <h2>6G Skill Library</h2>
                  <p>Browse and inspect raw agent skill definitions</p>
                </div>
              </div>
              <button
                onClick={() => setSkillLibraryOpen(false)}
                className="skill-library-close-btn"
              >
                <X size={20} />
              </button>
            </div>

            {/* Two-Pane Layout */}
            <div className="skill-library-content">
              {/* Sidebar (1/3) */}
              <div className="skill-library-sidebar">
                {isLoadingSkills ? (
                  <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <Loader2 size={24} className="animate-spin text-blue-500" />
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Loading skills...</span>
                  </div>
                ) : skillsError ? (
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', color: '#ef4444' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={16} />
                      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Error</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>{skillsError}</p>
                  </div>
                ) : (
                  skills.map((skill) => (
                    <button
                      key={skill.id}
                      onClick={() => setSelectedSkillId(skill.id)}
                      className={`skill-item-btn ${selectedSkillId === skill.id ? 'is-active' : ''}`}
                    >
                      <div className="skill-item-info">
                        <span className="skill-item-name">{skill.name}</span>
                        <span className="skill-item-desc">{skill.description}</span>
                      </div>
                      <ChevronRight 
                        size={14} 
                        className="skill-item-chevron"
                        style={{ 
                          opacity: selectedSkillId === skill.id ? 1 : 0,
                          transform: selectedSkillId === skill.id ? 'translateX(0)' : 'translateX(-4px)',
                          transition: 'all 0.2s'
                        }} 
                      />
                    </button>
                  ))
                )}
              </div>

              {/* Viewer (2/3) */}
              <div className="skill-library-viewer">
                {selectedSkill ? (
                  <>
                    <div className="viewer-label">
                      <div className="viewer-label-line" />
                      <span className="viewer-label-text">Raw Definition</span>
                      <div className="viewer-label-line" />
                    </div>
                    <pre className="viewer-pre">
                      {selectedSkill.definition}
                    </pre>
                  </>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontStyle: 'italic', fontSize: '0.875rem' }}>
                    {isLoadingSkills ? 'Waiting for library data...' : 'Select a skill to view its definition'}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="skill-library-footer">
              <button
                onClick={() => setSkillLibraryOpen(false)}
                className="footer-close-btn"
              >
                Close Viewer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SkillLibraryModal;
