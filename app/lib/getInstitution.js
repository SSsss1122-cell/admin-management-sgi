import { supabase } from './supabase';

export const getAdminInstitution = async () => {
  try {
    const adminMobile = localStorage.getItem('adminMobile');

    console.log('ADMIN MOBILE:', adminMobile);

    if (!adminMobile) {
      console.error('No admin mobile found');
      return null;
    }

    const { data, error } = await supabase
      .from('admins')
      .select('institution_id')
      .eq('mobile_number', adminMobile)
      .single();

    if (error) {
      console.error('Institution fetch error:', error);
      return null;
    }

    console.log('ADMIN DATA:', data);

    return data;
  } catch (err) {
    console.error('getAdminInstitution error:', err);
    return null;
  }
};