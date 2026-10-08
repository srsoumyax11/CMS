import { create_account } from "./create_account";

export const indianStudents = [
  { name: "Aarav Sharma", email: "aarav.sharma@bput.ac.in" },
  { name: "Vivaan Singh", email: "vivaan.singh@bput.ac.in" },
  { name: "Aditya Patel", email: "aditya.patel@bput.ac.in" },
  { name: "Vihaan Kumar", email: "vihaan.kumar@bput.ac.in" },
  { name: "Arjun Reddy", email: "arjun.reddy@bput.ac.in" },
  { name: "Sai Krishna", email: "sai.krishna@bput.ac.in" },
  { name: "Reyansh Gupta", email: "reyansh.gupta@bput.ac.in" },
  { name: "Krishna Iyer", email: "krishna.iyer@bput.ac.in" },
  { name: "Ishaan Verma", email: "ishaan.verma@bput.ac.in" },
  { name: "Shaurya Desai", email: "shaurya.desai@bput.ac.in" },
  { name: "Atharv Joshi", email: "atharv.joshi@bput.ac.in" },
  { name: "Rudra Nair", email: "rudra.nair@bput.ac.in" },
  { name: "Kabir Das", email: "kabir.das@bput.ac.in" },
  { name: "Ayaan Kapoor", email: "ayaan.kapoor@bput.ac.in" },
  { name: "Dhruv Malhotra", email: "dhruv.malhotra@bput.ac.in" },
  { name: "Kartik Menon", email: "kartik.menon@bput.ac.in" },
  { name: "Kunal Mehra", email: "kunal.mehra@bput.ac.in" },
  { name: "Devansh Rao", email: "devansh.rao@bput.ac.in" },
  { name: "Yash Agarwal", email: "yash.agarwal@bput.ac.in" },
  { name: "Pranav Pillai", email: "pranav.pillai@bput.ac.in" },
  { name: "Ananya Sharma", email: "ananya.sharma@bput.ac.in" },
  { name: "Diya Singh", email: "diya.singh@bput.ac.in" },
  { name: "Myra Patel", email: "myra.patel@bput.ac.in" },
  { name: "Saanvi Kumar", email: "saanvi.kumar@bput.ac.in" },
  { name: "Aadya Reddy", email: "aadya.reddy@bput.ac.in" },
  { name: "Prisha Iyer", email: "prisha.iyer@bput.ac.in" },
  { name: "Avni Gupta", email: "avni.gupta@bput.ac.in" },
  { name: "Nisha Verma", email: "nisha.verma@bput.ac.in" },
  { name: "Riya Desai", email: "riya.desai@bput.ac.in" },
  { name: "Kriti Joshi", email: "kriti.joshi@bput.ac.in" },
  { name: "Sneha Nair", email: "sneha.nair@bput.ac.in" },
  { name: "Pooja Das", email: "pooja.das@bput.ac.in" },
  { name: "Meera Kapoor", email: "meera.kapoor@bput.ac.in" },
  { name: "Kavya Malhotra", email: "kavya.malhotra@bput.ac.in" },
  { name: "Shruti Menon", email: "shruti.menon@bput.ac.in" },
  { name: "Swati Mehra", email: "swati.mehra@bput.ac.in" },
  { name: "Neha Rao", email: "neha.rao@bput.ac.in" },
  { name: "Roshni Agarwal", email: "roshni.agarwal@bput.ac.in" },
  { name: "Anjali Pillai", email: "anjali.pillai@bput.ac.in" },
  { name: "Simran Kaur", email: "simran.kaur@bput.ac.in" }
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
