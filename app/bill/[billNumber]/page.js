// app/bill/[billNumber]/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Download, Printer, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function BillPage() {
  const params = useParams();
  const billNumber = params?.billNumber;
  const billRef = useRef(null);
  
  const [billData, setBillData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [error, setError] = useState('');
  const [librariesLoaded, setLibrariesLoaded] = useState(false);

  // Load libraries on client side
  useEffect(() => {
    const loadLibraries = async () => {
      try {
        await import('dom-to-image');
        await import('jspdf');
        setLibrariesLoaded(true);
      } catch (err) {
        console.error('Failed to load PDF libraries:', err);
        setLibrariesLoaded(false);
      }
    };
    loadLibraries();
  }, []);

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

  const handleDownloadPDF = async () => {
    if (!billRef.current) {
      alert('Bill content not ready');
      return;
    }

    if (!librariesLoaded) {
      alert('PDF library is loading. Please try again in a moment.');
      return;
    }

    setDownloadLoading(true);

    try {
      // Dynamic imports
      const domToImage = (await import('dom-to-image')).default;
      const jsPDF = (await import('jspdf')).default;

      const element = billRef.current;
      
      // Generate image using dom-to-image (more reliable than html2canvas)
      const dataUrl = await domToImage.toJpeg(element, {
        quality: 0.95,
        bgcolor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (element.scrollHeight * pdfWidth) / element.scrollWidth;

      // Add image to PDF
      pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);

      // If content is taller than one page, add more pages
      let heightLeft = pdfHeight - pdf.internal.pageSize.getHeight();
      let position = -pdf.internal.pageSize.getHeight();

      while (heightLeft > 0) {
        position -= pdf.internal.pageSize.getHeight();
        pdf.addPage();
        pdf.addImage(dataUrl, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      // Save PDF
      pdf.save(`${billData.bill_number}.pdf`);

    } catch (error) {
      console.error('PDF generation error:', error);
      // Fallback: use print dialog
      alert('PDF download failed. Please use the Print button and select "Save as PDF".');
    } finally {
      setDownloadLoading(false);
    }
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
        {/* Header - Hidden in print */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6 no-print">
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
              onClick={handleDownloadPDF}
              disabled={downloadLoading || !librariesLoaded}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {downloadLoading ? (
                <><Loader2 size={18} className="animate-spin" /> Generating...</>
              ) : !librariesLoaded ? (
                <><Loader2 size={18} className="animate-spin" /> Loading Libraries...</>
              ) : (
                <><Download size={18} /> Download PDF</>
              )}
            </button>
          </div>
        </div>

        {/* Bill Content */}
        <div ref={billRef} className="bg-white rounded-2xl shadow-2xl overflow-hidden" id="bill-content">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-white print:py-4">
            <div className="flex justify-between items-center flex-wrap gap-4">
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

          {/* Body */}
          <div className="p-6 space-y-6 print:p-4">
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

            {/* Payment Date */}
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
            padding: 0 !important;
          }
          body {
            background: white !important;
          }
          .bg-slate-50 {
            background: #f8fafc !important;
          }
          .bg-gradient-to-r {
            background: #2563eb !important;
            background-image: linear-gradient(to right, #2563eb, #4f46e5) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}