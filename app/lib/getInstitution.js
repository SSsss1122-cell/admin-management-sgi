export const getInstitutionId = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('institution_id');
  }
  return null;
};