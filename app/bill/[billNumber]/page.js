// app/bill/[billNumber]/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Download, Printer, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// Helper: convert number to Indian English words
function numberToWords(num) {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = Math.floor(num % 1000);

  let words = '';
  if (crore > 0) words += ones[crore] + ' Crore ';
  if (lakh > 0) words += ones[lakh] + ' Lakh ';
  if (thousand > 0) words += ones[thousand] + ' Thousand ';
  if (remainder > 0) {
    if (remainder < 20) words += ones[remainder];
    else {
      const ten = Math.floor(remainder / 10);
      const one = remainder % 10;
      words += tens[ten];
      if (one > 0) words += ' ' + ones[one];
    }
  }
  return words.trim() + ' Rupees Only';
}

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
      const domToImage = (await import('dom-to-image')).default;
      const jsPDF = (await import('jspdf')).default;

      const element = billRef.current;
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

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (element.scrollHeight * pdfWidth) / element.scrollWidth;

      pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);

      let heightLeft = pdfHeight - pdf.internal.pageSize.getHeight();
      let position = -pdf.internal.pageSize.getHeight();

      while (heightLeft > 0) {
        position -= pdf.internal.pageSize.getHeight();
        pdf.addPage();
        pdf.addImage(dataUrl, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      pdf.save(`${billData.bill_number}.pdf`);

    } catch (error) {
      console.error('PDF generation error:', error);
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

  // Map API fields to receipt fields (use fallbacks if missing)
  const receipt = {
    receiptNo: billData.bill_number || 'N/A',
    parentName: billData.parent_name || billData.student_name || 'N/A',
    transactionId: billData.transaction_id || 'N/A',
    transactionDate: billData.transaction_date || billData.payment_date || 'N/A',
    modeOfPayment: billData.mode_of_payment || 'N/A',
    studentName: billData.student_name || 'N/A',
    department: billData.department || billData.branch || 'N/A',
    admissionNumber: billData.admission_number || billData.student_usn || 'N/A',
    academicYear: billData.academic_year || billData.period || 'N/A',
    amount: billData.total_fees || 0,
  };

  const amountInWords = numberToWords(receipt.amount);

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

        {/* Bill Content - Receipt with explicit white background and black text */}
        <div 
          ref={billRef} 
          className="rounded-2xl shadow-2xl overflow-hidden" 
          id="bill-content"
          style={{ backgroundColor: '#ffffff', color: '#000000' }}
        >
          <div className="p-6 md:p-8 print:p-6">
            {/* Header with Logo */}
            <div className="flex items-center gap-4 border-b border-gray-300 pb-4 mb-4">
              <div className="flex-shrink-0">
                <Image
                  src="/SGI.png"
                  alt="Shetty Group of Institutions"
                  width={200}
                  height={100}
                  className="object-contain"
                />
              </div>
              <div className="flex-1 text-center">
                <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#000000' }}>Shetty Group Of Institutions</h1>
                <p className="text-sm" style={{ color: '#333333' }}>Kalaburgi, Karnataka</p>
              </div>
            </div>

            {/* Receipt Title */}
            <h2 className="text-xl md:text-2xl font-bold text-center mb-4" style={{ color: '#000000' }}>FEE RECEIPT</h2>

            {/* Receipt Details - line by line */}
            <div className="text-sm space-y-1 mb-4" style={{ color: '#000000' }}>
              <div><span className="font-semibold">Receipt No:</span> {receipt.receiptNo}</div>
              <div><span className="font-semibold">Transaction ID:</span> {receipt.transactionId}</div>
              <div><span className="font-semibold">Parent Name:</span> {receipt.parentName}</div>
              <div><span className="font-semibold">Transaction Date:</span> {receipt.transactionDate}</div>
              <div><span className="font-semibold">Mode of Payment:</span> {receipt.modeOfPayment}</div>
            </div>

            {/* Student Info Table */}
            <div className="mb-4">
              <table className="w-full border border-gray-300 text-sm" style={{ color: '#000000' }}>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-1.5 font-semibold bg-gray-50 w-1/3" style={{ color: '#000000' }}>Student Name</td>
                    <td className="border border-gray-300 px-3 py-1.5" style={{ color: '#000000' }}>{receipt.studentName}</td>
                    <td className="border border-gray-300 px-3 py-1.5 font-semibold bg-gray-50 w-1/3" style={{ color: '#000000' }}>Department</td>
                    <td className="border border-gray-300 px-3 py-1.5" style={{ color: '#000000' }}>{receipt.department}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-1.5 font-semibold bg-gray-50" style={{ color: '#000000' }}>Admission Number</td>
                    <td className="border border-gray-300 px-3 py-1.5" style={{ color: '#000000' }}>{receipt.admissionNumber}</td>
                    <td className="border border-gray-300 px-3 py-1.5 font-semibold bg-gray-50" style={{ color: '#000000' }}>Academic Year</td>
                    <td className="border border-gray-300 px-3 py-1.5" style={{ color: '#000000' }}>{receipt.academicYear}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Particulars Table */}
            <div className="mb-4">
              <table className="w-full border border-gray-300 text-sm" style={{ color: '#000000' }}>
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-1.5 text-left" style={{ color: '#000000' }}>SI.No</th>
                    <th className="border border-gray-300 px-3 py-1.5 text-left" style={{ color: '#000000' }}>Particulars</th>
                    <th className="border border-gray-300 px-3 py-1.5 text-right" style={{ color: '#000000' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-1.5" style={{ color: '#000000' }}>1</td>
                    <td className="border border-gray-300 px-3 py-1.5" style={{ color: '#000000' }}>Bus Fee</td>
                    <td className="border border-gray-300 px-3 py-1.5 text-right" style={{ color: '#000000' }}>₹{receipt.amount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center border-t-2 border-gray-300 pt-3 mt-2">
              <div className="text-sm" style={{ color: '#000000' }}>
                <span className="font-semibold">Total:</span> {amountInWords}
              </div>
              <div className="text-lg font-bold" style={{ color: '#000000' }}>₹{receipt.amount.toFixed(2)}</div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs" style={{ color: '#555555' }}>
              <p>This is a system generated receipt. No signature required.</p>
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
            background-color: white !important;
            color: black !important;
          }
          body {
            background: white !important;
          }
          /* Ensure borders and background colors print */
          .border,
          .border-gray-300,
          .border-gray-400,
          .border-t-2,
          .border-b {
            border-color: #000 !important;
          }
          .bg-gray-50,
          .bg-gray-100 {
            background: #f3f4f6 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Force all text inside bill-content to be black */
          #bill-content * {
            color: #000 !important;
          }
          #bill-content .text-gray-500 {
            color: #555 !important;
          }
        }
      `}</style>
    </div>
  );
}