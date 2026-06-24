"use client";

export default function ReceiptClient({ receiptData }) {
  const { bill, student, payment, interval, academicYear } = receiptData;

  if (!bill || !student) {
    return <h2 style={{ padding: 20 }}>Receipt not found</h2>;
  }

  const amount = bill.paid_amount || bill.total_fees || 0;
  const amountInWords = numberToWords(amount);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatCurrency = (num) => {
    return num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <>
      <div className="page">
        <div className="receipt">
          {/* ===== HEADER WITH BIG LOGO ===== */}
          <div className="header">
            <img src="https://hluezfgmmzrjamutofxw.supabase.co/storage/v1/object/public/logos/SGi%20logo.png" alt="SGI Logo" className="logo" />
            <div className="college-info">
              <h2>Shetty Group Of Institutions</h2>
              <p>Kalaburgi, Karnataka</p>
              <h3>FEE RECEIPT</h3>
              <span>Original Copy</span>
            </div>
          </div>

          {/* ===== META ROWS ===== */}
          <div className="meta-row">
            <span>
              <b>Receipt No :</b> {bill.bill_number}
            </span>
            <span>
              <b>Transaction ID :</b> {payment?.razorpay_payment_id || "N/A"}
            </span>
          </div>

          <div className="meta-row">
            <span>
              <b>Parent Name :</b> {student.full_name}
            </span>
            <span>
              <b>Transaction Date :</b> {formatDate(payment?.payment_date)}
            </span>
          </div>

          <div className="meta-row single">
            <span>
              <b>Mode of Payment :</b> {payment?.payment_mode || "N/A"}
            </span>
          </div>

          {/* ===== STUDENT INFO TABLE ===== */}
          <table className="info-table">
            <tbody>
              <tr>
                <td className="label">Student Name</td>
                <td>{student.full_name}</td>
                <td className="label">Department</td>
                <td>{student.branch || "N/A"}</td>
              </tr>
              <tr>
                <td className="label">Admission Number</td>
                <td>{student.usn || "N/A"}</td>
                <td className="label">Academic Year</td>
                <td>{academicYear || "N/A"}</td>
              </tr>
            </tbody>
          </table>

          {/* ===== FEE DETAILS TABLE ===== */}
          <table className="fee-table">
            <thead>
              <tr>
                <th>Sl.No</th>
                <th>Particulars</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>Bus Fee</td>
                <td>₹{formatCurrency(amount)}</td>
              </tr>
            </tbody>
          </table>

          {/* ===== TOTAL SECTION ===== */}
          <div className="total-section">
            <span className="total-words">
              Total : {amountInWords} Rupees Only
            </span>
            <span className="total-amount">₹{formatCurrency(amount)}</span>
          </div>

          <p className="footer">
            This is a system generated receipt. No signature required.
          </p>

          <button className="printBtn" onClick={() => window.print()}>
            🖨️ Print Receipt
          </button>
        </div>
      </div>

      <style>{`
        .page {
          display: flex;
          justify-content: center;
          padding: 20px;
          background: #f5f5f5;
          font-family: Arial, sans-serif;
        }

        .receipt {
          width: 210mm;
          min-height: 297mm;
          background: white;
          padding: 15mm 20mm;
          color: #000;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
          box-sizing: border-box;
        }

        /* ===== HEADER WITH BIG ZOOMED LOGO ===== */
        /* ===== HEADER ===== */
.header {
  position: relative;
  text-align: center;
  border-bottom: 2px solid #000;
  padding: 8px 0 12px;
  margin-bottom: 18px;
  min-height: 240px; /* Increased to fit the 210px logo comfortably */
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===== LOGO (Left Side, Zoomed) ===== */
.logo {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 210px; /* Your requested size */
  width: auto;
  max-width: 220px; /* Prevents it from getting too wide */
  object-fit: contain;
  display: block;
}

/* ===== COLLEGE INFO BLOCK (Centered, pushed right so logo doesn't overlap) ===== */
.college-info {
  text-align: center;          /* Centered perfectly */
  width: 100%;                 /* Full width */
  padding-left: 220px;         /* Pushes the centered text to the right so it doesn't overlap the 210px logo */
  box-sizing: border-box;
}

.college-info h2 {
  margin: 0;
  font-size: 24px;
  letter-spacing: 0.5px;
  font-weight: bold;
}

.college-info p {
  margin: 2px 0;
  font-size: 14px;
  color: #333;
  text-align: center;          /* Explicitly centered */
}

.college-info h3 {
  margin: 8px 0 2px;
  font-size: 20px;
  letter-spacing: 1px;
  font-weight: bold;
  text-align: center;          /* Explicitly centered */
}

.college-info span {
  font-size: 13px;
  font-weight: bold;
  color: #555;
  text-align: center;          /* Explicitly centered */
}


        /* ===== META ROWS ===== */
        .meta-row {
          display: flex;
          justify-content: space-between;
          margin: 4px 0;
          font-size: 14px;
        }

        .meta-row.single {
          justify-content: flex-start;
        }

        .meta-row span {
          flex: 1;
        }

        .meta-row span:last-child {
          text-align: right;
        }

        .meta-row.single span {
          text-align: left;
        }

        /* ===== STUDENT INFO TABLE ===== */
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          border: 1px solid #000;
          font-size: 14px;
        }

        .info-table td {
          padding: 8px 12px;
          border: 1px solid #000;
        }

        .info-table .label {
          font-weight: bold;
          background: #f0f0f0;
          width: 18%;
        }

        .info-table td:not(.label) {
          width: 32%;
        }

        /* ===== FEE TABLE ===== */
        .fee-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          border: 1px solid #000;
          font-size: 14px;
        }

        .fee-table th,
        .fee-table td {
          padding: 8px 12px;
          border: 1px solid #000;
          text-align: center;
        }

        .fee-table th {
          background: #f0f0f0;
          font-weight: bold;
        }

        .fee-table td:first-child {
          width: 15%;
        }
        .fee-table td:nth-child(2) {
          width: 60%;
          text-align: left;
        }
        .fee-table td:last-child {
          width: 25%;
          text-align: right;
        }

        /* ===== TOTAL SECTION ===== */
        .total-section {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
          padding-top: 10px;
          border-top: 2px solid #000;
          font-size: 16px;
          font-weight: bold;
        }

        .total-words {
          text-transform: capitalize;
          font-size: 15px;
        }

        .total-amount {
          font-size: 18px;
        }

        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 12px;
          color: #555;
        }

        .printBtn {
          margin-top: 25px;
          padding: 12px 35px;
          background: #000;
          color: #fff;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          display: block;
          margin-left: auto;
          margin-right: auto;
          font-weight: bold;
        }

        .printBtn:hover {
          background: #333;
        }

        /* ===== PRINT STYLES ===== */
        @media print {
          .printBtn {
            display: none !important;
          }

          body {
            background: white !important;
            margin: 0;
            padding: 0;
          }

          .page {
            padding: 0 !important;
            background: white !important;
          }

          .receipt {
            box-shadow: none !important;
            width: 100%;
            min-height: 100vh;
            padding: 15mm 20mm !important;
          }

          .meta-row span:last-child {
            text-align: right;
          }
        }
      `}</style>
    </>
  );
}

// ===== HELPER: Convert number to Indian Rupees in words =====
function numberToWords(num) {
  if (num === 0) return "Zero";
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const numStr = num.toFixed(0);
  const parts = numStr.split(".");
  let rupees = parseInt(parts[0], 10);
  let paise = parts[1] ? parseInt(parts[1], 10) : 0;
  let words = "";

  const convert = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + convert(n % 100) : "")
      );
    if (n < 100000)
      return (
        convert(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 ? " " + convert(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        convert(Math.floor(n / 100000)) +
        " Lakh" +
        (n % 100000 ? " " + convert(n % 100000) : "")
      );
    return (
      convert(Math.floor(n / 10000000)) +
      " Crore" +
      (n % 10000000 ? " " + convert(n % 10000000) : "")
    );
  };

  words = convert(rupees);
  if (paise > 0) {
    words += " and " + convert(paise) + " Paise";
  }
  return words;
}