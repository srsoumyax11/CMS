import { create_account } from "./create_account";

export const indianStudents = [
  { name: "Aarav Sharma", email: "aarav.sharma@campusone.edu" },
  { name: "Vivaan Singh", email: "vivaan.singh@campusone.edu" },
  { name: "Aditya Patel", email: "aditya.patel@campusone.edu" },
  { name: "Vihaan Kumar", email: "vihaan.kumar@campusone.edu" },
  { name: "Arjun Reddy", email: "arjun.reddy@campusone.edu" },
  { name: "Sai Krishna", email: "sai.krishna@campusone.edu" },
  { name: "Reyansh Gupta", email: "reyansh.gupta@campusone.edu" },
  { name: "Krishna Iyer", email: "krishna.iyer@campusone.edu" },
  { name: "Ishaan Verma", email: "ishaan.verma@campusone.edu" },
  { name: "Shaurya Desai", email: "shaurya.desai@campusone.edu" },
  { name: "Atharv Joshi", email: "atharv.joshi@campusone.edu" },
  { name: "Rudra Nair", email: "rudra.nair@campusone.edu" },
  { name: "Kabir Das", email: "kabir.das@campusone.edu" },
  { name: "Ayaan Kapoor", email: "ayaan.kapoor@campusone.edu" },
  { name: "Dhruv Malhotra", email: "dhruv.malhotra@campusone.edu" },
  { name: "Kartik Menon", email: "kartik.menon@campusone.edu" },
  { name: "Kunal Mehra", email: "kunal.mehra@campusone.edu" },
  { name: "Devansh Rao", email: "devansh.rao@campusone.edu" },
  { name: "Yash Agarwal", email: "yash.agarwal@campusone.edu" },
  { name: "Pranav Pillai", email: "pranav.pillai@campusone.edu" },
  { name: "Ananya Sharma", email: "ananya.sharma@campusone.edu" },
  { name: "Diya Singh", email: "diya.singh@campusone.edu" },
  { name: "Myra Patel", email: "myra.patel@campusone.edu" },
  { name: "Saanvi Kumar", email: "saanvi.kumar@campusone.edu" },
  { name: "Aadya Reddy", email: "aadya.reddy@campusone.edu" },
  { name: "Prisha Iyer", email: "prisha.iyer@campusone.edu" },
  { name: "Avni Gupta", email: "avni.gupta@campusone.edu" },
  { name: "Nisha Verma", email: "nisha.verma@campusone.edu" },
  { name: "Riya Desai", email: "riya.desai@campusone.edu" },
  { name: "Kriti Joshi", email: "kriti.joshi@campusone.edu" },
  { name: "Sneha Nair", email: "sneha.nair@campusone.edu" },
  { name: "Pooja Das", email: "pooja.das@campusone.edu" },
  { name: "Meera Kapoor", email: "meera.kapoor@campusone.edu" },
  { name: "Kavya Malhotra", email: "kavya.malhotra@campusone.edu" },
  { name: "Shruti Menon", email: "shruti.menon@campusone.edu" },
  { name: "Swati Mehra", email: "swati.mehra@campusone.edu" },
  { name: "Neha Rao", email: "neha.rao@campusone.edu" },
  { name: "Roshni Agarwal", email: "roshni.agarwal@campusone.edu" },
  { name: "Anjali Pillai", email: "anjali.pillai@campusone.edu" },
  { name: "Simran Kaur", email: "simran.kaur@campusone.edu" }
];

export async function seedStudents(count: number = 40) {
  const maxCount = Math.min(count, indianStudents.length);
  console.log(`Starting to seed ${maxCount} Indian students...`);
  const password = "Password123!";
  
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < maxCount; i++) {
    const student = indianStudents[i];
    try {
      const emailTokens = student.email.split("@");
      const uniqueEmail = `${emailTokens[0]}_${Date.now()}@${emailTokens[1]}`;
      
      process.stdout.write(`\r[${i + 1}/${maxCount}] Seeding ${student.name}...`);
      
      await create_account(uniqueEmail, student.name, password);
      successCount++;
    } catch (error) {
      console.log(`\nFailed to create account for ${student.name}: ${error}`);
      errorCount++;
    }
    
    // Add a short delay
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\n\nSeeding completed. Successfully added: ${successCount}, Failed: ${errorCount}`);
}
