'use client';
import { useState, useEffect } from 'react';

export function useInstitution() {
  const [institutionId, setInstitutionId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('institutionId');
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInstitutionId(stored);
    }
    setLoading(false);
  }, []);

  const setInstitution = (id) => {
    localStorage.setItem('institutionId', id);
    setInstitutionId(id);
  };

  const clearInstitution = () => {
    localStorage.removeItem('institutionId');
    setInstitutionId(null);
  };

  return { institutionId, setInstitution, clearInstitution, loading };
}