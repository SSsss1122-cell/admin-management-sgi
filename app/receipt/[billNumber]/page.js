// app/receipt/[billNumber]/page.js
import ReceiptClient from "./ReceiptClient";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function Page({ params }) {
  // 🔥 CRITICAL FIX: In Next.js 15+, params is a Promise. AWAIT it first!
  const resolvedParams = await params;
  
  console.log("Params received:", resolvedParams); // Check terminal

  const billNumber = resolvedParams?.billNumber;

  if (!billNumber) {
    return <h2>Invalid bill number – missing parameter</h2>;
  }

  const trimmedBillNumber = billNumber.trim();

  const { data: bill, error } = await supabase
    .from("bill_pdfs")
    .select("*")
    .eq("bill_number", trimmedBillNumber);

  const billData = bill?.[0];

  if (!billData) {
    return <h2>Receipt not found</h2>;
  }

  const { data: student } = await supabase
    .from("students_new")
    .select("*")
    .eq("id", billData.student_id)
    .single();

  const { data: paymentLog } = await supabase
    .from("payment_logs")
    .select("*")
    .eq("bill_number", trimmedBillNumber)
    .single();

  let interval = null;
  let academicYear = "";

  if (paymentLog?.interval_id) {
    const { data: intervalData } = await supabase
      .from("student_intervals")
      .select("*")
      .eq("id", paymentLog.interval_id)
      .single();
    interval = intervalData;
    if (interval) {
      const startYear = new Date(interval.start_date).getFullYear();
      const endYear = new Date(interval.end_date).getFullYear();
      academicYear = `${startYear} - ${endYear}`;
    }
  }

  const receiptData = {
    bill: billData,
    student: student,
    payment: paymentLog,
    interval: interval,
    academicYear: academicYear,
  };

  return <ReceiptClient receiptData={receiptData} />;
}