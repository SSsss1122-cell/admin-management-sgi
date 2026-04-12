if (message.toUpperCase() === "LIST") {

  const { data, error } = await supabase
    .from("students")
    .select("full_name, usn")
    .limit(10);

  if (error) {
    console.error(error);
  }

  let reply = "📋 Student List:\n\n";

  data.forEach((s, i) => {
    reply += `${i + 1}. ${s.full_name} (${s.usn})\n`;
  });

  await fetch("https://app.viralboostup.in/api/v2/whatsapp-business/messages", {
    method: "POST",
    headers: {
      "Authorization": "Bearer YOUR_API_KEY",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to: from,
      type: "text",
      text: {
        body: reply
      }
    })
  });
}