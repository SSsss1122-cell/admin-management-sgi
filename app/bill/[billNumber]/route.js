// app/api/bill/[billNumber]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request, { params }) {
  try {
    const { billNumber } = params;
    
    if (!billNumber) {
      return NextResponse.json(
        { success: false, error: 'Bill number required' },
        { status: 400 }
      );
    }

    // Fetch bill from database
    const { data, error } = await supabase
      .from('bill_pdfs')
      .select('*, students_new(full_name, usn, branch)')
      .eq('bill_number', billNumber)
      .single();

    if (error || !data) {
      console.error('Bill not found:', error);
      return NextResponse.json(
        { success: false, error: 'Bill not found' },
        { status: 404 }
      );
    }

    // Format response
    const billData = {
      bill_number: data.bill_number,
      student_name: data.students_new?.full_name || 'N/A',
      student_usn: data.students_new?.usn || 'N/A',
      branch: data.students_new?.branch || 'N/A',
      period: '2024-2025',
      total_fees: data.total_fees || 0,
      paid_amount: data.paid_amount || 0,
      due_amount: data.due_amount || 0,
      status: data.status || 'Pending',
      generated_at: data.generated_at,
      payment_date: data.payment_date || data.generated_at,
    };

    return NextResponse.json({
      success: true,
      data: billData,
    });

  } catch (error) {
    console.error('Error fetching bill:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}