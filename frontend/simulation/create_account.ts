export async function getOtpFromMailpit(email: string): Promise<string> {
  const mailpitUrl = `http://127.0.0.1:54324/api/v1/messages`;
  
  // Try fetching the mailbox multiple times in case of delay
  for (let i = 0; i < 5; i++) {
    const res = await fetch(mailpitUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data.messages && data.messages.length > 0) {
        // Find the latest message for the specific email
        const userMessages = data.messages.filter((m: any) => m.To[0].Address === email);
        if (userMessages.length > 0) {
          const latestMsgId = userMessages[0].ID;
          
          // Fetch message details
          const msgRes = await fetch(`http://127.0.0.1:54324/api/v1/message/${latestMsgId}`);
          const msgData = await msgRes.json();
          
          // Extract 6-digit OTP from text body
          const textBody = msgData.Text || "";
          const match = textBody.match(/\b\d{6}\b/);
          
          if (match) {
            return match[0];
          }
        }
      }
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error("Could not find OTP in Mailpit.");
}

export async function create_account(email: string, name: string, password: string) {
  // Step 1: Request Open Signup
  const signupRes = await fetch("http://127.0.0.1:8000/api/auth/open-signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name, password })
  });
  
  const signupData = await signupRes.json();
  if (!signupRes.ok || !signupData.success) {
    throw new Error(`Signup failed: ${JSON.stringify(signupData)}`);
  }
  
  const sessionToken = signupData.data.session_token;
  
  // Step 2: Retrieve OTP from Mailpit
  const otp = await getOtpFromMailpit(email);
  
  // Step 3: Verify OTP and create account
  const verifyRes = await fetch("http://127.0.0.1:8000/api/auth/verify-signup-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      otp,
      session_token: sessionToken,
      name,
      password
    })
  });
  
  const verifyData = await verifyRes.json();
  if (!verifyRes.ok || !verifyData.success) {
    throw new Error(`Verification failed: ${JSON.stringify(verifyData)}`);
  }
  
  return verifyData.data;
}
