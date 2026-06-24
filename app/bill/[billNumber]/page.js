// app/bill/[billNumber]/page.js
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Download, Printer, ArrowLeft, CreditCard, Calendar, User, Hash, IndianRupee } from 'lucide-react';
import Link from 'next/link';

export default function BillPage() {
  const params = useParams();
  const billNumber = params?.billNumber;
  
  const [billData, setBillData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (billNumber) {
      fetchBill(billNumber);
    }
  }, [billNumber]);

  const fetchBill = async (billNo) => {
    try {
      const res = await fetch(`/api/bill/${billNo}`);
      const data = await res.json();
      
      if (data.success) {
        setBillData(data.data);
      } else {
        setError(data.error || 'Bill not found');
      }
    } catch (error) {
      setError('Error fetching bill');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-blue-600"></div>
      </div>
    );
  }

  if (error || !billData) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">📄</div>
          <h2 className="text-2xl font-bold text-white mb-2">Bill Not Found</h2>
          <p className="text-slate-400">{error || 'This bill does not exist'}</p>
          <Link href="/" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 no-print">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} /> Back to Home
          </Link>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition-all"
            >
              <Printer size={18} /> Print
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
            >
              <Download size={18} /> Download PDF
            </button>
          </div>
        </div>

        {/* Bill Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" id="bill-content">
          {/* Bill Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">🧾 Fee Bill</h1>
                <p className="text-blue-100 mt-1">Shetty Group of Institutions</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-100">Bill Number</p>
                <p className="text-xl font-bold">{billData.bill_number}</p>
              </div>
            </div>
          </div>

          {/* Bill Body */}
          <div className="p-6 space-y-6">
            {/* Student Info */}
            <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-sm text-slate-500">Student Name</p>
                <p className="font-semibold text-slate-800">{billData.student_name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">USN</p>
                <p className="font-semibold text-slate-800">{billData.student_usn || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Branch</p>
                <p className="font-semibold text-slate-800">{billData.branch || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Period</p>
                <p className="font-semibold text-slate-800">{billData.period || 'N/A'}</p>
              </div>
            </div>

            {/* Amount Details */}
            <div>
              <h3 className="font-semibold text-slate-800 mb-3">Amount Details</h3>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total Fees</span>
                  <span className="font-medium text-slate-800">₹{billData.total_fees?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Amount Paid</span>
                  <span className="font-medium text-emerald-600">₹{billData.paid_amount?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                  <span className="text-slate-600">Balance</span>
                  <span className={`font-bold ${billData.due_amount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    ₹{billData.due_amount?.toLocaleString() || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="flex justify-between items-center bg-slate-50 rounded-xl p-4">
              <span className="text-slate-600">Status</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                billData.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                billData.status === 'Partial' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {billData.status}
              </span>
            </div>

            {/* Payment Details */}
            {billData.payment_date && (
              <div className="flex justify-between items-center bg-slate-50 rounded-xl p-4">
                <span className="text-slate-600">Payment Date</span>
                <span className="font-medium text-slate-800">
                  {new Date(billData.payment_date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-slate-200 pt-4 text-center text-sm text-slate-500">
              <p>This is a computer-generated bill. Thank you for your payment.</p>
              <p className="mt-1">© {new Date().getFullYear()} Shetty Group of Institutions</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          #bill-content {
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 20px !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}